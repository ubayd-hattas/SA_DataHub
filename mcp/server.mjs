#!/usr/bin/env node
// Runs the SA Data Hub MCP server over standard input and output. Nothing else may be written to stdout.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './sa-data-hub.mjs'

await createServer().connect(new StdioServerTransport())
