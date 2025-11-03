# About Scorers - Do You Need Them?

## What are Scorers?

**Scorers** are automated evaluation metrics that assess the quality of your agent's outputs. They return scores (typically 0-1) that measure things like:

- **Accuracy**: Is the response correct?
- **Completeness**: Did it cover all important points?
- **Relevancy**: Does it actually answer the question?
- **Tool Usage**: Did the agent use the right tool?
- **Quality**: Is the output well-structured and helpful?

## Example from Weather Agent

The weather agent uses scorers to evaluate:
1. **Tool Call Appropriateness**: Did it use the weatherTool when it should?
2. **Completeness**: Did it provide all necessary weather information?
3. **Translation Quality**: Did it correctly translate non-English location names?

## Do You Need Scorers for Study Buddy?

### ✅ **Optional - Not Required for MVP**

**You can skip scorers for now!** Your study buddy agent will work perfectly without them.

### When You Might Want Scorers Later:

1. **Quality Monitoring** (Production)
   - Track if flashcards are accurate
   - Monitor if study plans are realistic
   - Ensure PDF processing is complete

2. **Performance Tracking** (Analytics)
   - See how well the agent generates materials
   - Identify areas for improvement
   - Compare different prompt strategies

3. **Debugging** (Development)
   - Understand why certain responses aren't good
   - Test different agent configurations
   - Validate tool usage

## Recommended Scorers (If You Add Them Later)

If you decide to add scorers later, these would be useful:

1. **Completeness Scorer**
   - Did the flashcard cover the topic fully?
   - Is the study plan comprehensive?

2. **Answer Relevancy Scorer**
   - Do the flashcards actually relate to the content?
   - Are study plan topics relevant to the document?

3. **Custom Scorer for Flashcard Quality**
   - Are flashcards educational?
   - Is the difficulty appropriate?
   - Do image prompts make sense?

## Bottom Line

**For MVP/Initial Development:**
- ❌ **Skip scorers** - Focus on core functionality first
- Your agent will work fine without them
- Add them later when you need quality monitoring

**For Production/Monitoring:**
- ✅ **Consider adding scorers** - Helpful for tracking quality
- Useful for identifying issues
- Good for continuous improvement

## Current Setup

Your `studyBuddyAgent` currently has **NO scorers** - which is perfectly fine! You can add them later if needed.

```typescript
// Current agent (no scorers) - THIS IS OK!
export const studyBuddyAgent = new Agent({
  name: 'Study Buddy Agent',
  // ... instructions, model, tools
  // No scorers section - that's fine!
});
```

If you want to add scorers later, you would do:

```typescript
export const studyBuddyAgent = new Agent({
  // ... existing config
  scorers: {
    completeness: {
      scorer: createCompletenessScorer(),
      sampling: { type: 'ratio', rate: 0.1 }, // Sample 10% of responses
    },
    // ... more scorers
  },
});
```

## Recommendation

**Skip scorers for now** - get the core functionality working first (PDF processing, flashcard generation, study plans). Add scorers later when you want to:
- Monitor quality in production
- Track improvements over time
- Debug specific issues

Your agent is ready to use without scorers! 🎯

