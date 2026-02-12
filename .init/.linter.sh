#!/bin/bash
cd /home/kavia/workspace/code-generation/recipe-explorer-281255-281264/recipe_app_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

