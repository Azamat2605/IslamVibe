import type { Endpoint, EndpointParameters } from "./endpoints";
import type { TextGenerationStreamOutputSimplified } from "./endpoints";
import { config } from "$lib/server/config";
import { z } from "zod";

export interface DifySSEEvent {
	event: "message" | "error" | "done" | "node_finished" | "workflow_finished";
	data: string | object;
}

export interface DifyMessageData {
	answer?: string;
	conversation_id?: string;
	error?: string;
}

export interface DifyWorkflowData {
	outputs?: {
		answer?: string;
	};
}

// Parameters for Dify endpoint (minimal, only type)
export const endpointDifyParametersSchema = z.object({
	type: z.literal("dify"),
	// _model is passed by addEndpoint but not used (prefixed with _ to indicate unused)
	_model: z.unknown().optional(),
});

// Debug flag - можно включить через переменную окружения DIFY_DEBUG
const DEBUG = (config as unknown as Record<string, unknown>).DIFY_DEBUG === "true";

/**
 * Endpoint for Dify.ai Chat API
 * Sends a POST request to DIFY_API_URL/chat-messages and streams the SSE response.
 */
export async function endpointDify(
	input: z.input<typeof endpointDifyParametersSchema>
): Promise<Endpoint> {
	// input is not used for configuration, but we parse it for consistency
	endpointDifyParametersSchema.parse(input);

	const apiKey = config.DIFY_API_KEY;
	const apiUrl = config.DIFY_API_URL;

	if (!apiKey || !apiUrl) {
		throw new Error("DIFY_API_KEY and DIFY_API_URL must be set in environment variables");
	}

	return async (
		params: EndpointParameters
	): Promise<AsyncGenerator<TextGenerationStreamOutputSimplified, void, void>> => {
		const { messages, abortSignal } = params;

		// Last user message
		const userMessage = messages.filter((m) => m.from === "user").pop();
		if (!userMessage) {
			throw new Error("No user message found");
		}

		const query = userMessage.content;
		const inputs = {}; // Dify inputs can be empty for simple chat

		const body = {
			inputs,
			query,
			response_mode: "streaming" as const,
			user: "huggingchat-user",
		};

		const url = `${apiUrl}/chat-messages`;
		const requestStartTime = performance.now();
		if (DEBUG) {
			console.log(`[Dify] [TIMING] Request start: ${requestStartTime.toFixed(2)}ms`);
			console.log("[Dify] Fetching URL:", url);
			console.log("[Dify] Request body:", JSON.stringify(body, null, 2));
		}
		const response = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${apiKey}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
			signal: abortSignal,
		});
		const firstByteTime = performance.now();
		if (DEBUG) {
			console.log(`[Dify] [TIMING] First byte received: ${firstByteTime.toFixed(2)}ms`);
			console.log(
				`[Dify] [TIMING] Time to first byte: ${(firstByteTime - requestStartTime).toFixed(2)}ms`
			);
			console.log("[Dify] Response status:", response.status, response.statusText);
		}

		if (!response.ok) {
			const errorText = await response.text();
			console.error("[Dify] Error response body:", errorText);
			throw new Error(`Dify API error: ${response.status} ${response.statusText} - ${errorText}`);
		}

		if (!response.body) {
			throw new Error("Dify API response has no body");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		let tokenId = 0;
		let generatedText = "";

		async function* generate(): AsyncGenerator<TextGenerationStreamOutputSimplified, void, void> {
			try {
				let firstChunkTime: number | null = null;
				let eventCount = 0;
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					const chunkTime = performance.now();
					if (firstChunkTime === null) {
						firstChunkTime = chunkTime;
						if (DEBUG) {
							console.log(`[Dify] [TIMING] First chunk received: ${chunkTime.toFixed(2)}ms`);
							console.log(
								`[Dify] [TIMING] Time from request start to first chunk: ${(chunkTime - requestStartTime).toFixed(2)}ms`
							);
						}
					}

					const rawChunk = decoder.decode(value, { stream: false });
					if (DEBUG) {
						console.log(
							`[Dify] [CHUNK] Size: ${rawChunk.length} bytes, Time: ${chunkTime.toFixed(2)}ms`
						);
						console.log("[Dify] RAW CHUNK:", rawChunk);
					}
					buffer += rawChunk;
					const lines = buffer.split("\n");
					buffer = lines.pop() || ""; // keep incomplete line

					for (const line of lines) {
						const lineTime = performance.now();
						if (DEBUG) {
							console.log(`[Dify] [LINE] Time: ${lineTime.toFixed(2)}ms, Line:`, line);
						}
						// Only process lines that start with "data: "
						if (!line.startsWith("data: ")) {
							continue;
						}
						// Extract everything after "data: " and trim whitespace
						const data = line.slice(6).trim();
						if (DEBUG) {
							console.log(`[Dify] [SSE] Time: ${lineTime.toFixed(2)}ms, Data:`, data);
						}

						// Skip empty lines and "[DONE]" (handled separately)
						// Note: "undefined" is treated as a valid data value that may come from Dify
						if (!data) {
							if (DEBUG) console.warn("[Dify] Skipping empty data line");
							continue;
						}
						// If data is the string "undefined", it's likely a sentinel value from Dify, skip it
						if (data === "undefined") {
							if (DEBUG) console.warn("[Dify] Skipping 'undefined' data line");
							continue;
						}
						if (data === "[DONE]") {
							// End of stream
							const doneTime = performance.now();
							if (DEBUG) {
								console.log(`[Dify] [TIMING] [DONE] marker received: ${doneTime.toFixed(2)}ms`);
								console.log(
									`[Dify] [TIMING] Total time from request start: ${(doneTime - requestStartTime).toFixed(2)}ms`
								);
							}
							yield {
								token: {
									id: tokenId++,
									text: "",
									logprob: 0,
									special: true,
								},
								generated_text: generatedText,
								details: null,
							};
							return;
						}

						// Safe JSON parsing
						try {
							const event: DifySSEEvent = JSON.parse(data);
							eventCount++;
							const eventTime = performance.now();
							if (DEBUG) {
								console.log(
									`[Dify] [EVENT #${eventCount}] Time: ${eventTime.toFixed(2)}ms, Type: ${event.event}, Data:`,
									event.data
								);
							}

							// Helper to extract answer from event data
							const extractAnswer = (eventData: unknown): string | undefined => {
								// Try multiple possible paths
								if (typeof eventData === "object" && eventData !== null) {
									const data = eventData as Record<string, unknown>;
									// 1. Standard message answer
									if (typeof data.answer === "string") return data.answer;
									// 2. Other possible text fields
									if (typeof data.content === "string") return data.content;
									if (typeof data.message === "string") return data.message;
									if (typeof data.response === "string") return data.response;
									if (typeof data.text === "string") return data.text;
									// 3. Workflow outputs answer
									const outputs = data.outputs as Record<string, unknown> | undefined;
									if (outputs && typeof outputs === "object") {
										if (typeof outputs.answer === "string") return outputs.answer;
										if (typeof outputs.text === "string") return outputs.text;
										if (typeof outputs.content === "string") return outputs.content;
									}
									// 4. Nested in data field
									const nestedData = data.data as Record<string, unknown> | undefined;
									if (nestedData && typeof nestedData === "object") {
										if (typeof nestedData.answer === "string") return nestedData.answer;
									}
								} else if (typeof eventData === "string") {
									// If eventData is a string, it might be the answer itself
									return eventData;
								}
								return undefined;
							};

							// Determine eventData based on type of event.data
							let eventData: unknown;
							if (typeof event.data === "string") {
								try {
									eventData = JSON.parse(event.data);
								} catch (innerError) {
									if (DEBUG)
										console.warn(
											"[Dify] event.data is a string but not JSON, treating as raw text:",
											event.data
										);
									eventData = event.data; // Use the string as the data
								}
							} else {
								// event.data is already an object
								eventData = event.data;
							}

							if (
								event.event === "message" ||
								event.event === "node_finished" ||
								event.event === "workflow_finished"
							) {
								if (eventData) {
									const answer = extractAnswer(eventData);
									if (answer !== undefined) {
										const answerLength = answer.length;
										const delta = answer.slice(generatedText.length);
										const deltaLength = delta.length;
										if (DEBUG) {
											console.log(
												`[Dify] [ANSWER] Time: ${eventTime.toFixed(2)}ms, Length: ${answerLength}, Delta: ${deltaLength}, Text: "${answer.substring(0, 50)}${answer.length > 50 ? "..." : ""}"`
											);
											console.log(`[Dify] [DELTA] "${delta}"`);
											console.log(`[Dify] [ACCUMULATED] "${generatedText}"`);
										}
										if (delta) {
											generatedText = answer;
											const yieldTime = performance.now();
											if (DEBUG) {
												console.log(
													`[Dify] [YIELD] Time: ${yieldTime.toFixed(2)}ms, Delta length: ${deltaLength}`
												);
											}
											// Immediately yield the delta to frontend
											yield {
												token: {
													id: tokenId++,
													text: delta,
													logprob: 0,
													special: false,
												},
												generated_text: null,
												details: null,
											};
										} else {
											if (DEBUG) console.log(`[Dify] [NO DELTA] No new text in this event`);
										}
									} else {
										if (DEBUG) console.log(`[Dify] [NO ANSWER] Event contains no answer field`);
									}
								} else {
									if (DEBUG) console.log(`[Dify] [NO EVENT DATA] Event data is null or undefined`);
								}
							} else if (event.event === "error") {
								console.error(`[Dify] [ERROR] Time: ${eventTime.toFixed(2)}ms, Data:`, eventData);
								let errorMessage = "Unknown error";
								if (typeof eventData === "object" && eventData !== null) {
									const errData = eventData as Record<string, unknown>;
									if (typeof errData.error === "string") errorMessage = errData.error;
									else if (typeof errData.message === "string") errorMessage = errData.message;
								}
								throw new Error(`Dify error: ${errorMessage}`);
							} else if (event.event === "done") {
								// End of stream signaled by Dify
								const doneTime = performance.now();
								if (DEBUG) {
									console.log(`[Dify] [TIMING] 'done' event received: ${doneTime.toFixed(2)}ms`);
									console.log(
										`[Dify] [TIMING] Total time from request start: ${(doneTime - requestStartTime).toFixed(2)}ms`
									);
								}
								yield {
									token: {
										id: tokenId++,
										text: "",
										logprob: 0,
										special: true,
									},
									generated_text: generatedText,
									details: null,
								};
								return;
							}
						} catch (e) {
							if (DEBUG)
								console.warn(
									`[Dify] [PARSE ERROR] Time: ${performance.now().toFixed(2)}ms, Error:`,
									e,
									"for data:",
									data
								);
							// Ignore parse errors and continue processing next line
							continue;
						}
					}
				}
			} finally {
				reader.releaseLock();
				const endTime = performance.now();
				if (DEBUG) {
					console.log(`[Dify] [TIMING] Stream processing ended: ${endTime.toFixed(2)}ms`);
					console.log(
						`[Dify] [TIMING] Total request duration: ${(endTime - requestStartTime).toFixed(2)}ms`
					);
				}
			}
		}

		return generate();
	};
}
