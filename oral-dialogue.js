'use strict';

const instructions = [
  'You are Xiaoyu, speaking in an English conversation that is already underway. Reply in one or two casual English sentences.',
  'Answer the learner’s question first. Keep track of who did what: say “you” for the learner’s actions and “I” for yours.',
  'Follow the latest version of any details the learner corrects. React to a concrete detail without inventing things you saw the learner or other people do.',
  'Clarify ambiguous references when needed. Never guess a person’s identity, gender or actions.',
  'Ask a follow-up only if it adds something. Skip questions whose answers the learner already gave.',
  'Do not echo the learner, offer chatbot-style help, give language feedback, or write speaker labels.'
].join(' ');

// Original examples based on the emotional situations and everyday dialogue acts
// studied in EmpatheticDialogues (P19-1534) and DailyDialog (I17-1099).
const everydayConversation = [
  'In free chat, match the speaker’s mood without overstating it. Acknowledge what happened or how it felt before offering advice.',
  'If they just want to be heard, give them room. If they share good news, respond to the specific accomplishment.',
  'Respond to short answers in context. Let thanks and goodbyes end naturally. A question is optional.',
  'These are style examples only. Use the actual conversation details in your reply:',
  '“I finally finished the draft.” → “That must feel good after all that work.”',
  '“My friends went out without me.” → “Oof, that hurts. Finding out afterward can make it sting even more.”',
  '“I just needed to say it out loud.” → “Yeah, sometimes it helps to get it out. I’m listening.”',
  '“Let’s talk about something else.” → “Sure. What are you in the mood to talk about?”'
].join('\n');

const normalize = value => value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const sentences = text => text.match(/[^.!?]+[.!?]*/g) || [];
const reciprocalQuestion = /^(?:(?:what|how) about (?:you|yourself)|and you)$/;

function beginsWithEcho(learner, reply) {
  const source = normalize(learner);
  const candidate = normalize(reply);
  return candidate.split(' ').length >= 3 && (source === candidate || source.startsWith(candidate + ' '));
}

function buildOralHistory(input, tokenize) {
  const opening = String(input.opening || '').trim().slice(0, 250);
  const role = String(input.question || '').trim().slice(0, 500);
  const referenceHint = /^(?:(?:i (?:think|guess|believe)|maybe)\s+)?(?:he|she)\b/i.test(input.text)
    ? '\nThe last message refers to someone. If the transcript does not identify that person, simply ask “Who do you mean?”'
    : '';
  const spokenHint = input.spoken
    ? '\nThe last message comes from speech recognition. Interpret short phrases using context. If a likely misheard word changes the meaning, ask one brief question. On a live call, keep small talk to one short thought at a time. Answer questions with enough detail to be clear.'
    : '';
  const system = instructions + (role ? '\nYour role: ' + role : '') + referenceHint + spokenHint +
    (input.conversation ? '\n' + everydayConversation : '');
  const history = [{ type: 'system', text: system }];
  if (opening) history.push({ type: 'model', response: [opening] });

  const turns = Array.isArray(input.turns) ? input.turns.slice(-40) : [];
  const recent = [];
  let remaining = 3400 - tokenize(system + '\n' + opening + '\n' + input.text).length;
  // Keep complete exchanges in order. Leave room for the template, retry and reply.
  for (let i = turns.length - 1; i > 0; i--) {
    const learner = turns[i - 1];
    const teacher = turns[i];
    if (learner?.role !== 'user' || teacher?.role !== 'teacher' ||
        typeof learner.text !== 'string' || typeof teacher.text !== 'string') continue;
    const user = learner.text.trim().slice(0, 1000);
    const parts = sentences(teacher.text.trim().slice(0, 800));
    let echoed = '';
    while (parts.length && beginsWithEcho(user, echoed + parts[0])) echoed += parts.shift();
    const reply = parts.join('').trim();
    if (!user) continue;
    const cost = tokenize(user + '\n' + reply).length + 24;
    if (cost > remaining) break;
    remaining -= cost;
    if (reply) recent.unshift({ type: 'model', response: [reply] });
    recent.unshift({ type: 'user', text: user });
    i--;
  }
  return history.concat(recent);
}

function readOralReply(result, learner, history) {
  const candidate = String(result.responseText || '').trim()
    .replace(/^(?:Xiaoyu|Teacher|Assistant)\s*:\s*/i, '')
    .replace(/[\p{Extended_Pictographic}\p{Emoji_Modifier}\uFE0F\u200D*_]/gu, '')
    .trim();
  if (!candidate || result.stopReason === 'maxTokens' || /\n\s*(?:Learner|Student|User|Xiaoyu|Teacher|Assistant)\s*:/i.test(candidate)) return '';

  const earlierQuestions = new Set(history.filter(item => item.type === 'model')
    .flatMap(item => item.response[0].match(/[^.!?]+\?/g) || []).map(normalize));
  const learnerAskedBack = sentences(learner).some(sentence => sentence.endsWith('?') &&
    reciprocalQuestion.test(normalize(sentence)));
  const text = sentences(candidate).filter(sentence =>
    !/\b(?:let me know if you (?:need|want|have)|i (?:saw|watched) (?:him|her|them|you))\b/i.test(sentence) &&
    !(sentence.endsWith('?') && (earlierQuestions.has(normalize(sentence)) ||
      (learnerAskedBack && reciprocalQuestion.test(normalize(sentence)))))).join('').replace(/\s+/g, ' ').trim();

  const normalized = normalize(text);
  const replySentences = new Set(sentences(text).map(normalize));
  const userSentences = sentences(learner);
  if (!normalized || normalized === normalize(learner) || userSentences.some(sentence => {
    const words = normalize(sentence);
    return words.split(' ').length >= 3 && (replySentences.has(words) || normalized.startsWith(words + ' '));
  })) return '';

  return text;
}

module.exports = { buildOralHistory, readOralReply };
