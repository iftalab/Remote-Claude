#!/bin/bash

# This is the exact command from the PM2 logs
claude -p "You are an AI assistant helping with the \"remote-claude\" project.

Directory: /Users/ifta/Documents/projects/remote-claude

Your role is to assist with development tasks, answer questions, and help maintain this codebase.

Please respond with \"Ready.\" to confirm you've loaded this context.

Hi" --allowedTools "Bash,Read,Write,Edit,Glob,Grep" --dangerously-skip-permissions
