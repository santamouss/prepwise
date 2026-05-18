import assert from "node:assert/strict";
import test from "node:test";

import {
  buildResumeAssistantSystemInstruction,
  createNoiseBargeInState,
  isAssistantActivelySpeaking,
  shouldConfirmCancelOnAcceptedBargeIn,
  shouldDeferCancelOnAssistantSpeechStarted,
  shouldResumeAfterRejectedNoise,
} from "../server/openai-voice-relay-noise-barge-in";

test("shouldDeferCancelOnAssistantSpeechStarted when assistant is speaking", () => {
  assert.equal(shouldDeferCancelOnAssistantSpeechStarted(true), true);
  assert.equal(shouldDeferCancelOnAssistantSpeechStarted(false), false);
});

test("isAssistantActivelySpeaking reflects TTS and in-flight response state", () => {
  assert.equal(
    isAssistantActivelySpeaking({
      responseInFlight: false,
      modelIsSpeaking: false,
      responseAudioStarted: false,
      outputTranscriptBuffer: "",
    }),
    false,
  );
  assert.equal(
    isAssistantActivelySpeaking({
      responseInFlight: true,
      modelIsSpeaking: false,
      responseAudioStarted: false,
      outputTranscriptBuffer: "",
    }),
    true,
  );
  assert.equal(
    isAssistantActivelySpeaking({
      responseInFlight: false,
      modelIsSpeaking: false,
      responseAudioStarted: true,
      outputTranscriptBuffer: "Hello",
    }),
    true,
  );
});

test("rejected noise during assistant TTS triggers resume when assistant was interrupted", () => {
  const state = createNoiseBargeInState();
  state.possibleBargeIn = true;
  state.assistantInterrupted = true;
  state.interruptedAssistantText = "Tell me about a time you led a project.";

  assert.equal(
    shouldResumeAfterRejectedNoise({
      possibleBargeIn: state.possibleBargeIn,
      assistantInterrupted: state.assistantInterrupted,
      transcriptRejected: true,
    }),
    true,
  );
});

test("accepted user speech during possibleBargeIn confirms cancel and does not resume", () => {
  assert.equal(
    shouldConfirmCancelOnAcceptedBargeIn({
      possibleBargeIn: true,
      assistantInterrupted: false,
      transcriptAccepted: true,
    }),
    true,
  );
  assert.equal(
    shouldResumeAfterRejectedNoise({
      possibleBargeIn: true,
      assistantInterrupted: false,
      transcriptRejected: false,
    }),
    false,
  );
});

test("rejected noise when assistant was not interrupted does not resume", () => {
  assert.equal(
    shouldResumeAfterRejectedNoise({
      possibleBargeIn: false,
      assistantInterrupted: false,
      transcriptRejected: true,
    }),
    false,
  );
});

test("buildResumeAssistantSystemInstruction avoids restarting from question 1 when past Q1", () => {
  const instruction = buildResumeAssistantSystemInstruction({
    interruptedText: "What tradeoffs would you consider?",
    currentQuestionIndex: 2,
  });
  assert.match(instruction, /question 3/i);
  assert.match(instruction, /Do NOT restart/i);
  assert.match(instruction, /Continue or repeat/i);
});
