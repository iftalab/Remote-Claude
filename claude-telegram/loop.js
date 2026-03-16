/**
 * Autonomous Loop Module
 *
 * Manages goal-driven autonomous execution where the agent works
 * iteratively towards a goal, sending status updates and requesting
 * sign-off before commits.
 */

const EventEmitter = require('events');

// Signal patterns
const SIGNALS = {
  GOAL_COMPLETE: /GOAL_COMPLETE/i,
  COMMIT_READY: /git\s+commit/i,
  AWAITING_HUMAN: /AWAITING_HUMAN/i
};

/**
 * Autonomous Loop Manager
 */
class AutonomousLoop extends EventEmitter {
  constructor(agent, options = {}) {
    super();

    this.agent = agent;
    this.active = false;
    this.goal = null;
    this.stepCount = 0;
    this.pendingCommit = false;
    this.commitData = null;
  }

  /**
   * Start the autonomous loop with a goal
   *
   * @param {string} goal - The goal to achieve
   */
  async start(goal) {
    if (this.active) {
      throw new Error('Loop is already active');
    }

    if (!this.agent || !this.agent.ready()) {
      throw new Error('Agent is not ready');
    }

    console.log(`[Loop] Starting autonomous loop with goal: ${goal}`);

    this.active = true;
    this.goal = goal;
    this.stepCount = 0;
    this.pendingCommit = false;
    this.commitData = null;

    // Emit start event
    this.emit('start', { goal });

    // Send initial goal instruction
    const instruction =
      `Your goal: ${goal}\n\n` +
      `Work autonomously step by step. ` +
      `After each step, summarize what you did and what you will do next. ` +
      `Before any git commit, output "COMMIT_READY:" followed by a summary of the changes. ` +
      `When the goal is fully achieved, output "GOAL_COMPLETE".`;

    try {
      const response = await this.agent.sendMessage(instruction);
      await this.processResponse(response);
    } catch (error) {
      console.error(`[Loop] Error during start:`, error.message);
      this.emit('error', { error });
      this.stop();
    }
  }

  /**
   * Stop the autonomous loop
   */
  async stop() {
    if (!this.active) {
      console.log(`[Loop] Loop is not active`);
      return;
    }

    console.log(`[Loop] Stopping autonomous loop`);

    try {
      // Send stop instruction
      const stopInstruction = 'Stop what you are doing. Summarize progress so far.';
      const response = await this.agent.sendMessage(stopInstruction);

      this.active = false;
      this.emit('stop', { summary: response });

    } catch (error) {
      console.error(`[Loop] Error during stop:`, error.message);
      this.active = false;
      this.emit('error', { error });
    }
  }

  /**
   * Process a response from the agent
   *
   * @param {string} response - The response text
   */
  async processResponse(response) {
    this.stepCount++;

    console.log(`[Loop] Processing step ${this.stepCount}`);

    // Check for goal completion
    if (SIGNALS.GOAL_COMPLETE.test(response)) {
      console.log(`[Loop] Goal completed!`);
      this.active = false;
      this.emit('complete', { stepCount: this.stepCount, response });
      return;
    }

    // Check for commit ready
    if (SIGNALS.COMMIT_READY.test(response)) {
      console.log(`[Loop] Commit detected, requesting sign-off`);
      this.pendingCommit = true;
      this.commitData = {
        response,
        stepCount: this.stepCount
      };
      this.emit('commit_ready', { stepCount: this.stepCount, response });
      return; // Wait for approval
    }

    // Check for awaiting human
    if (SIGNALS.AWAITING_HUMAN.test(response)) {
      console.log(`[Loop] Agent awaiting human input`);
      this.emit('awaiting_human', { stepCount: this.stepCount, response });
      // Continue the loop, agent will handle human tasks
    }

    // Emit step update
    this.emit('step', {
      stepCount: this.stepCount,
      response
    });

    // Continue to next step if still active
    if (this.active && !this.pendingCommit) {
      await this.continueLoop();
    }
  }

  /**
   * Continue the loop to the next step
   */
  async continueLoop() {
    if (!this.active) {
      return;
    }

    try {
      // Send a continuation prompt
      const continuePrompt = 'Continue with the next step towards the goal.';
      const response = await this.agent.sendMessage(continuePrompt);
      await this.processResponse(response);
    } catch (error) {
      console.error(`[Loop] Error during continue:`, error.message);
      this.emit('error', { error });
      this.stop();
    }
  }

  /**
   * Approve a pending commit
   */
  async approveCommit() {
    if (!this.pendingCommit) {
      throw new Error('No pending commit to approve');
    }

    console.log(`[Loop] Commit approved, continuing`);

    this.pendingCommit = false;
    const commitData = this.commitData;
    this.commitData = null;

    this.emit('commit_approved', commitData);

    try {
      // Send approval and continue
      const approval = 'Commit approved. Proceed with the commit and continue to the next step.';
      const response = await this.agent.sendMessage(approval);
      await this.processResponse(response);
    } catch (error) {
      console.error(`[Loop] Error after approval:`, error.message);
      this.emit('error', { error });
      this.stop();
    }
  }

  /**
   * Reject a pending commit
   */
  async rejectCommit() {
    if (!this.pendingCommit) {
      throw new Error('No pending commit to reject');
    }

    console.log(`[Loop] Commit rejected, skipping`);

    this.pendingCommit = false;
    this.commitData = null;

    this.emit('commit_rejected', {});

    try {
      // Send rejection and continue
      const rejection = 'Commit rejected. Skip this commit and continue to the next step.';
      const response = await this.agent.sendMessage(rejection);
      await this.processResponse(response);
    } catch (error) {
      console.error(`[Loop] Error after rejection:`, error.message);
      this.emit('error', { error });
      this.stop();
    }
  }

  /**
   * Check if loop is active
   */
  isActive() {
    return this.active;
  }

  /**
   * Check if there's a pending commit
   */
  hasPendingCommit() {
    return this.pendingCommit;
  }

  /**
   * Get current goal
   */
  getGoal() {
    return this.goal;
  }

  /**
   * Get current step count
   */
  getStepCount() {
    return this.stepCount;
  }
}

module.exports = AutonomousLoop;
