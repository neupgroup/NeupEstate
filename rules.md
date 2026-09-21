# File and Code Organization
Follow a domain-first, namespace-mirrored module structure.

1. Organize code by business domain and responsibility.
   Do not organize primarily into global controllers, services,
   helpers, or utils folders.

2. Mirror logical namespaces in filesystem paths.
   Every namespace segment before the final segment is a folder.
   The final segment is a file for an operation or a folder for
   a module containing multiple responsibilities.

   Example:
   logica.estate.properties.get
   → logica/estate/properties/get.ts

3. Use nouns for domain folders and verbs for operation files.
   Examples: properties/, agent/, get.ts, create.ts, assign.ts.

4. Let the path provide context.
   Use properties/get.ts, not properties/getProperties.ts.
   Avoid repeating the full namespace in local identifiers.

5. Prefix internal implementation files with "_".
   Examples: _filter.ts, _sort.ts, _paginate.ts.
   External modules must access the public module API instead
   of importing these internal files directly.

6. Use index.ts as the explicit public entry point or mapping
   for a module when needed.
   Keep it small. Prefer named exports.
   Do not put business logic there or automatically re-export
   every internal file.

7. Keep code beside the domain that owns it.
   Move shared code to the nearest common owning module only
   when multiple consumers actually need it.

8. Give each operation one clear responsibility.
   Separate files when behavior has an independent purpose,
   not merely to make files smaller.

9. Avoid vague names such as manager, handler, processor,
   common, and utils when a domain-specific name is possible.

10. Follow existing vocabulary consistently.
    Do not alternate between agent/broker or property/listing
    unless they represent genuinely different concepts.

11. Avoid empty folders, unnecessary wrapper functions,
    speculative abstractions, and circular dependencies.

12. Before adding code, identify its domain, public namespace,
    owning module, and whether it is public or internal.
    Extend the existing structure instead of creating a new
    organizational pattern.




# Neup Code Organization and Naming Guidelines**

Follow these conventions when generating or modifying Neup code. Inspect existing code first, preserve compatible public APIs, and apply these rules consistently to new work.

**1. Organize by business domain**

Group code by the business concept it belongs to.

* Use domains such as `estate`, `identity`, and `billing`.
* Place property operations inside `estate/properties`.
* Keep domain-specific validation, queries, and transformations close to their owner.
* Create shared modules only when multiple domains actually need the same behavior.
* Avoid broad dumping grounds such as `helpers.ts`, `common.ts`, and `utils.ts`.

**2. Mirror the public namespace in the filesystem**

Each namespace segment maps to a folder. A terminal operation maps to an underscore-prefixed implementation file.

| Public API                             | Implementation                           |
| -------------------------------------- | ---------------------------------------- |
| `logica.estate.properties.get()`       | `logica/estate/properties/_get.ts`       |
| `logica.estate.properties.list()`      | `logica/estate/properties/_list.ts`      |
| `logica.estate.properties.filter()`    | `logica/estate/properties/_filter.ts`    |
| `logica.estate.properties.type.list()` | `logica/estate/properties/type/_list.ts` |
| `logica.estate.agent.get()`            | `logica/estate/agent/_get.ts`            |

Use `index.ts` to assemble each public namespace.

An underscore marks an implementation file by convention. It does not enforce privacy; exports and package boundaries control access.

**3. Give `index.ts` one responsibility**

Use `index.ts` for explicit exports and namespace assembly.

* Keep business logic, database queries, and validation out of it.
* Export only intended public members.
* Do not automatically expose every file.
* Inside a module, import implementations directly when importing its own index would create a cycle.
* Across modules, use their public entry points.

**4. Use descriptive names without repeating context**

Names must describe their meaning at the location where they appear.

| Avoid                               | Prefer                                           |
| ----------------------------------- | ------------------------------------------------ |
| `pId`                               | `propertyId`                                     |
| `res`                               | `properties` or `response`, according to meaning |
| `processData()`                     | `validateListing()`                              |
| `flag`                              | `includeArchived`                                |
| `estate.properties.getProperties()` | `estate.properties.list()`                       |

Use concise operation names inside a clear namespace. Use descriptive standalone names when that context is absent.

Standard abbreviations such as `id`, `url`, and `api` are acceptable.

**5. Apply consistent casing and number**

* Variables, parameters, functions, and namespace members: `lowerCamelCase`.
* Types, interfaces, and classes: `PascalCase`.
* Domain folders: match the namespace spelling.
* Operation files: `_lowerCamelCase.ts`.
* Constants: `UPPER_SNAKE_CASE` for fixed, module-level constants.
* Values: singular for one item, plural for collections—`property`, `properties`.
* Types: `Property`, `PropertyFilter`, `ListPropertiesInput`.

Namespace names are stable domain vocabulary. Preserve an established name such as `estate.agent`; do not switch between `agent` and `agents` across modules.

**6. Give operations predictable meanings**

| Operation  | Meaning                                                     |
| ---------- | ----------------------------------------------------------- |
| `get`      | Retrieve one item by identity                               |
| `list`     | Retrieve a collection                                       |
| `create`   | Create a new item                                           |
| `update`   | Change specified fields                                     |
| `delete`   | Remove an item                                              |
| `archive`  | Retain an item while marking it inactive                    |
| `validate` | Check rules without saving                                  |
| `parse`    | Convert an external representation into a defined structure |

Use business verbs such as `approve`, `publish`, and `assign` when those express the actual action.

Document whether a missing item returns `null` or throws. Follow the existing project convention.

**7. Make inputs explicit**

* Prefer named input objects when parameters are optional, easily confused, or likely to grow.
* Use `propertyId`, `agentId`, and `agencyId` when multiple identities are involved.
* Include units where ambiguity matters: `roadWidthFeet`, `builtUpAreaSquareFeet`, `timeoutMilliseconds`.
* Use `createdAt` for an instant and `startDate` for a calendar date.
* Define timezones, range boundaries, defaults, and omitted-value behavior.
* Avoid positional booleans such as `list(true, false)`.

**8. Name booleans by their meaning**

Use state names such as `isPublished`, `hasRoadAccess`, and `canEdit`.

Use option names such as `includeArchived` or `validateDocuments`.

Document what both boolean values do and the default. Prefer positive names; avoid confusing double negatives.

**9. Document contracts and consequential behavior**

Public operations should explain inputs, outputs, defaults, relevant errors, and side effects.

Explain business rules and surprising decisions. Do not add comments that merely repeat the code.

Never hide failures by returning an empty collection or a success-shaped result.

**10. Keep generated code focused**

* Reuse existing domain terminology and implementations.
* Avoid speculative factories, managers, services, and abstraction layers.
* Create files around coherent responsibilities.
* Do not create empty folders for hypothetical features.
* Keep internal helpers private unless callers need them.
* Do not rename unrelated code during a focused change.

Before finishing, verify that the namespace, filesystem, exports, naming, and actual behavior agree.




# Design and Content Guidelines
Visit this URL and follow the rules as mentioned in this repo:
https://github.com/jkelleman/ai-content-design-handbook





# API QUERY, INCLUSION, AND TRANSPORT CONVENTIONS

1. Field selection with include

Use the include parameter to define returned fields and relationships.

Example:
  ?include=agent(id,name),otherfield,otherfield()

Rules:
- Separate selections with commas.
- Use parentheses for nested field selection.
- agent(id,name) returns only the agent's id and name.
- otherfield returns that field's documented default representation.
- otherfield() explicitly selects an object or relationship and returns
  its documented default readable fields.
- Empty parentheses are invalid for scalar fields.
- Support deeper selections:
    agent(id,name,agency(id,name))
- Use the same selection syntax for objects and arrays; the response
  schema determines their data type.
- Selections apply to each returned resource, not the response envelope.
- Return pagination metadata independently of include.
- If include is omitted, return the documented default fields.
- Never expose unauthorized or internal fields through inclusion.

The example above illustrates syntax alternatives. If a field appears
multiple times, merge its selections deterministically. A default
selection includes the default fields plus any explicitly selected
children.

2. Filtering through parameter names

Use field names as query parameter keys.
Use parentheses to traverse nested objects.

Examples:
  ?agent(name)=Srijal
  ?agent(id)=agent_123
  ?otherfield=value
  ?agent(agency(id))=agency_456

Each filter key must identify exactly one field.
Do not allow multiple fields inside a filter key.

Valid:
  agent(id)=agent_123

Invalid:
  agent(id,name)=agent_123,Srijal

Combine different filters using AND:
  ?agent(id)=agent_123&type=house

Default matching is typed equality, not substring matching.
Validate and convert values using the resource schema.
Define string matching as case-sensitive unless a field documents
otherwise.

Reject duplicate filter keys instead of silently choosing a value.
Do not invent syntax for OR, ranges, or array traversal. Define those
extensions explicitly before implementing them.

3. Reserved parameters

Reserve:
- include
- orderBy
- pageSize
- pageToken

These control the request and are not resource filters.
Prevent schema fields from conflicting with these reserved names.

Example, shown before URL encoding:
  GET /properties?type=house&agent(id)=agent_123&include=id,type,agent(id,name)&pageSize=50

4. Long requests: switch from GET to POST

Support:
  GET /properties
  POST /properties/search

Use GET when the complete encoded URL is at most 2,000 bytes.
Use POST /properties/search when it exceeds 2,000 bytes.

This is our configurable project threshold, not a universal URL limit.
Measure UTF-8 bytes after URL encoding, not unencoded character count.

Build requests from one structured query object. Choose transport
before sending; do not build a URL and then manually parse it back.

For POST:
- Move all resource filters into a filters object.
- Move include, orderBy, pageSize, and pageToken into top-level fields.
- Keep the same nested filter keys and include syntax.
- Use application/json.
- Do not duplicate search parameters in both the URL and body.
- Never send a GET request body.

Example:
  POST /properties/search

  {
    "filters": {
      "type": "house",
      "agent(id)": "agent_123"
    },
    "include": "id,type,agent(id,name),metainfo(listedOn,listedBy)",
    "orderBy": "metainfo.listedOn desc,id",
    "pageSize": 50
  }

Normalize GET string values and POST JSON values against the same
schema so equivalent requests produce identical results.

POST /properties/search is read-only.
POST /properties remains the resource-creation endpoint.

If GET returns HTTP 414, retry the equivalent search once using POST.
Do not automatically retry unrelated errors.

5. Shared implementation and validation

Both transports must use the same:
- Normalized request model.
- Filter and inclusion parsers.
- Validation and authorization.
- Database query builder.
- Pagination and response format.

Parse nested syntax with a proper parser that handles balanced
parentheses. Do not split nested expressions using commas alone.

Allowlist filterable fields and selectable relationships.
Use parameterized database queries; never concatenate user input
into SQL or execute it as code.

Reject unknown fields, malformed selections, invalid values, and
unsupported operations with clear errors.

Apply documented limits to request-body size, nesting, filter count,
relationship expansion, page size, and query execution time.
POST avoids the URL budget; it does not remove request limits.

Use URLSearchParams for GET serialization.
Do not manually concatenate or double-encode parameter values.


# Parameter sources and conflict resolution

Use endpoint-defined input sources. Do not choose the source based
on whether the URL or body happens to contain a value.

GET /properties:
- Read filters, include, orderBy, pageSize, and pageToken from the URL.
- Do not accept a request body.

POST /properties/search:
- Read filters, include, orderBy, pageSize, and pageToken from JSON.
- Reject search-related URL parameters with HTTP 400.
- Do not merge URL search parameters with the JSON body.
- Do not silently ignore one source or allow it to override another.

Other endpoints:
- Explicitly document which fields belong in the path, query, or body.
- Query parameters and JSON may coexist when they represent different,
  explicitly assigned fields.

Conflicts:
- Reject fields supplied in an unsupported location, even if their
  values match the supported source.
- Never override a path identifier with a query or body value.
- Return an error identifying the parameter and its expected location.

Missing and empty values:
- Apply defaults only when a field is absent.
- Validate explicit null, empty strings, false, and zero against the
  schema; do not treat them as missing.
- Invalid input must produce an error, never trigger fallback to
  another source.

Long-URL conversion:
- When the encoded URL exceeds 2,000 bytes, the client sends the
  complete search request to POST /properties/search as JSON.
- Remove all search parameters from the URL.
- Preserve all filters, selections, sorting, and pagination values.
- Use the same normalized request model for both transports.

These are our API's rules, not a claim that all Google APIs reject
mixed query and body input.

For example, this is invalid under your contract:
POST /properties/search?type=house
Content-Type: application/json

{
  "filters": {
    "type": "land"
  }
}
Neither value wins. Return:
{
  "error": {
    "code": "INVALID_ARGUMENT",
    "message": "Search parameter 'type' must be provided in the JSON body at 'filters.type', not in the URL."
  }
}
