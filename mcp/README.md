# SA Data Hub MCP server

Lets an AI assistant that speaks the [Model Context Protocol](https://modelcontextprotocol.io) fetch South African official statistics with their citations. It runs on your own computer and reads the public API at [sadatahub.tech/api](https://sadatahub.tech/api). It needs no key and no account.

## Tools

| Tool | Returns |
|---|---|
| `list_series` | Every statistic, with its id, publisher and dates. Takes an optional `search` |
| `get_series` | One statistic: values over time, source, release date, checked date, terms and citation. Takes `id` and an optional `last` |
| `get_fuel_prices` | The latest official fuel prices, in cents per litre, with the DMPR source and terms |

## Setup

You need Node 20.9 or newer. Install everything: do not pass `--omit=dev`, because the MCP SDK is a development dependency.

```bash
git clone https://github.com/ubayd-hattas/SA_DataHub.git
cd SA_DataHub
npm ci
```

With Claude Code, using the full path to your copy:

```bash
claude mcp add sa-data-hub -- node /full/path/to/SA_DataHub/mcp/server.mjs
```

Other MCP clients take the same command (`node`) and argument (the path to `server.mjs`).

Then ask, for example: "What was South Africa's latest headline inflation rate? Cite it."

## Terms

Each result carries the publisher's terms. Some, such as the DMPR's for fuel prices, do not allow commercial use. Pass the credit line on with any figure.

## Test

`npm test` runs `tests/unit/mcp-server.test.ts`: a real MCP client calls the server, and the replies come from the site's own API route code. It makes no network request.
