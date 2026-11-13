{
	// Not linked to Encore Cloud: we self-host (docs/decisions/0002-encore-ts-on-aiven.md).
	"id": "",
	"lang": "typescript",
	"global_cors": {
		// Frontend origins that may call the API with credentials. Add the deployed origin here.
		"allow_origins_with_credentials": ["http://localhost:5300"]
	}
}
