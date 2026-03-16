/**
 * Planning Mode Module
 *
 * Handles interactive planning sessions where the agent asks questions
 * to gather requirements and produces a TASKS.md as output.
 */

const EventEmitter = require('events');

// Signal patterns for planning mode
const SIGNALS = {
  PLAN_QUESTION_CHOICE: /PLAN_QUESTION_CHOICE:\s*(.+)/i,
  PLAN_QUESTION_TEXT: /PLAN_QUESTION_TEXT:\s*(.+)/i,
  PLAN_COMPLETE: /PLAN_COMPLETE/i
};

/**
 * Planning Session Manager
 */
class PlanningSession extends EventEmitter {
  constructor(agent, options = {}) {
    super();

    this.agent = agent;
    this.active = false;
    this.topic = null;
    this.pendingPlan = null;
    this.questionCount = 0;
  }

  /**
   * Start a planning session
   *
   * @param {string} topic - The topic to plan for
   */
  async start(topic) {
    if (this.active) {
      throw new Error('Planning session already active');
    }

    if (!this.agent || !this.agent.ready()) {
      throw new Error('Agent is not ready');
    }

    console.log(`[Planner] Starting planning session for: ${topic}`);

    this.active = true;
    this.topic = topic;
    this.pendingPlan = null;
    this.questionCount = 0;

    // Emit start event
    this.emit('start', { topic });

    // Send planning mode instruction
    const instruction =
      `Enter planning mode for: ${topic}\n\n` +
      `Ask me questions one at a time to understand requirements. ` +
      `Use "PLAN_QUESTION_CHOICE: <question>" format for multiple choice questions, ` +
      `followed by numbered options (1. Option A, 2. Option B, etc.). ` +
      `Use "PLAN_QUESTION_TEXT: <question>" format for open-ended questions. ` +
      `When you have enough information, produce a complete TASKS.md and output "PLAN_COMPLETE".`;

    try {
      const response = await this.agent.sendMessage(instruction);
      await this.processResponse(response);
    } catch (error) {
      console.error(`[Planner] Error during start:`, error.message);
      this.emit('error', { error });
      this.cancel();
    }
  }

  /**
   * Cancel the planning session
   */
  cancel() {
    if (!this.active) {
      console.log(`[Planner] No active session to cancel`);
      return;
    }

    console.log(`[Planner] Cancelling planning session`);

    this.active = false;
    this.pendingPlan = null;
    this.emit('cancel', {});
  }

  /**
   * Process a response from the agent during planning
   *
   * @param {string} response - The response text
   */
  async processResponse(response) {
    console.log(`[Planner] Processing response (${response.length} chars)`);

    // Check for plan completion
    if (SIGNALS.PLAN_COMPLETE.test(response)) {
      console.log(`[Planner] Plan complete`);

      // Extract the TASKS.md content (everything after PLAN_COMPLETE)
      const planContent = this.extractPlanContent(response);
      this.pendingPlan = planContent;

      this.emit('plan_complete', {
        questionCount: this.questionCount,
        plan: planContent
      });
      return;
    }

    // Check for multiple choice question
    const choiceMatch = response.match(SIGNALS.PLAN_QUESTION_CHOICE);
    if (choiceMatch) {
      this.questionCount++;
      const question = choiceMatch[1].trim();
      const options = this.extractOptions(response);

      console.log(`[Planner] Multiple choice question: ${question}`);

      this.emit('question_choice', {
        questionCount: this.questionCount,
        question,
        options,
        rawResponse: response
      });
      return;
    }

    // Check for text question
    const textMatch = response.match(SIGNALS.PLAN_QUESTION_TEXT);
    if (textMatch) {
      this.questionCount++;
      const question = textMatch[1].trim();

      console.log(`[Planner] Text question: ${question}`);

      this.emit('question_text', {
        questionCount: this.questionCount,
        question,
        rawResponse: response
      });
      return;
    }

    // General response (no specific question detected)
    this.emit('response', { response });
  }

  /**
   * Extract options from a multiple choice question response
   *
   * @param {string} response - The response containing options
   * @returns {Array<string>} Array of options
   */
  extractOptions(response) {
    const lines = response.split('\n');
    const options = [];

    for (const line of lines) {
      // Match numbered options like "1. Option text" or "1) Option text"
      const match = line.match(/^\s*(\d+)[\.\)]\s*(.+)/);
      if (match) {
        options.push(match[2].trim());
      }
    }

    return options;
  }

  /**
   * Extract TASKS.md content from plan complete response
   *
   * @param {string} response - The response containing PLAN_COMPLETE
   * @returns {string} The TASKS.md content
   */
  extractPlanContent(response) {
    // Look for markdown code block or just extract everything after PLAN_COMPLETE
    const parts = response.split(/PLAN_COMPLETE/i);
    if (parts.length < 2) {
      return response; // Return full response if no PLAN_COMPLETE marker
    }

    let content = parts[1].trim();

    // If content is in a code block, extract it
    const codeBlockMatch = content.match(/```(?:markdown|md)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      content = codeBlockMatch[1];
    }

    return content;
  }

  /**
   * Submit an answer to the current question
   *
   * @param {string} answer - The answer text
   */
  async submitAnswer(answer) {
    if (!this.active) {
      throw new Error('No active planning session');
    }

    console.log(`[Planner] Submitting answer: ${answer.substring(0, 50)}...`);

    try {
      const response = await this.agent.sendMessage(answer);
      await this.processResponse(response);
    } catch (error) {
      console.error(`[Planner] Error submitting answer:`, error.message);
      this.emit('error', { error });
      this.cancel();
    }
  }

  /**
   * Provide feedback on the proposed plan for revision
   *
   * @param {string} feedback - Feedback on the plan
   */
  async submitFeedback(feedback) {
    if (!this.active || !this.pendingPlan) {
      throw new Error('No pending plan to revise');
    }

    console.log(`[Planner] Submitting plan feedback`);

    // Clear pending plan so we can get a revised one
    this.pendingPlan = null;

    try {
      const feedbackMessage = `Please revise the plan based on this feedback: ${feedback}`;
      const response = await this.agent.sendMessage(feedbackMessage);
      await this.processResponse(response);
    } catch (error) {
      console.error(`[Planner] Error submitting feedback:`, error.message);
      this.emit('error', { error });
      this.cancel();
    }
  }

  /**
   * Confirm and finalize the pending plan
   */
  confirmPlan() {
    if (!this.pendingPlan) {
      throw new Error('No pending plan to confirm');
    }

    console.log(`[Planner] Plan confirmed`);

    const plan = this.pendingPlan;
    this.active = false;
    this.pendingPlan = null;

    this.emit('confirmed', { plan });

    return plan;
  }

  /**
   * Check if session is active
   */
  isActive() {
    return this.active;
  }

  /**
   * Check if there's a pending plan awaiting confirmation
   */
  hasPendingPlan() {
    return this.pendingPlan !== null;
  }

  /**
   * Get the pending plan
   */
  getPendingPlan() {
    return this.pendingPlan;
  }

  /**
   * Get the current topic
   */
  getTopic() {
    return this.topic;
  }

  /**
   * Get question count
   */
  getQuestionCount() {
    return this.questionCount;
  }
}

module.exports = PlanningSession;
