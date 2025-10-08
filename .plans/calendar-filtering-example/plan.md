# Calendar Filtering Example for obsidian-ics

**Strategic Intent:** Demonstrate filtering calendar events by source in Templater templates, OR document the gap if this capability doesn't exist.

## Context

Users want to separate events from multiple ICS files (e.g., "personal" vs "work") into distinct template sections. Before creating an example, we must determine if the plugin exposes calendar source metadata and filtering capabilities.

## Acceptance Criteria

- [ ] Plugin's calendar identification mechanism is documented (filename, NAME property, or other)
- [ ] If filtering exists: Working Templater template with two calendar-filtered sections
- [ ] If filtering exists: Example placed in established examples location with README reference
- [ ] If filtering missing: Gap documented with minimal implementation proposal for user approval

## Steps

### Step 1: Investigation Burst (15 min)

**Intent:** Determine if calendar filtering exists, how calendars are identified, and where examples belong.

**Files/Actions:**
- Find main plugin class: `rg "class.*Plugin extends Plugin" src/`
- Check event data structure: `rg "interface.*Event|type.*Event" src/ --type ts -A 10`
- Find Templater API surface: `rg "registerTemplaterHelper|templater" src/ --type ts`
- Locate examples: `ls examples/ docs/examples/ 2>/dev/null || echo "no examples dir"`
- Check README for example patterns: `rg -i "example|template" README.md`
- Search for calendar/source metadata: `rg "calendar(Name|Source|Id)" src/ --type ts`

**Decision Point:**
- ✅ **Events have calendar metadata + API exposes filtering** → Proceed to Step 2a
- ⚠️ **Events have metadata but no filtering API** → Proceed to Step 2b (implementation needed)
- ❌ **No calendar metadata tracked** → Proceed to Step 2c (document gap only)

**Verification:** Can answer: "Do events know their source calendar?" and "Can Templater users filter by it?"

---

### Step 2a: Create Working Example (if filtering exists)

**Intent:** Write template matching existing example patterns, showing two calendar-filtered sections.

**Files:**
- Create: `examples/calendar-filtering.md` OR `docs/examples/calendar-filtering.md` (match Step 1 findings)
- Edit: `README.md` (add link if examples section exists)

**Content:**
- **Setup section:** How users identify their calendar sources (show command/method)
- **Template code:** Two sections using discovered filtering syntax
  ```
  ## Personal Events
  <%* ... filter by personal calendar ... %>
  
  ## Work Events  
  <%* ... filter by work calendar ... %>
  ```
- **Expected output:** Sample rendering

**Verification:**
- Example file exists in correct location
- Syntax matches discovered API
- README links to it (if pattern exists)

---

### Step 2b: Document Gap + Propose Implementation (if metadata exists, filtering doesn't)

**Intent:** Spec minimal changes needed; get user approval before implementing.

**Deliverable (comment/doc):**
- **Current state:** Events track calendar via `[specific field]`, but no filtering helper
- **Proposal:** Add `filterByCalendar(calendarName: string)` method to Templater API
- **Files affected:** `[templater integration file]`, `[API registration]`
- **Complexity:** ~30 min implementation + testing

**Next:** Report findings; await approval to implement.

---

### Step 2c: Document Gap Only (if no calendar metadata)

**Intent:** Explain limitation; propose parser-level changes.

**Deliverable (comment/doc):**
- **Current state:** Events don't store calendar source during parsing
- **Minimal implementation:**
  1. Add `source: string` field to Event interface
  2. Capture filename/NAME property during ICS parsing
  3. Expose filtering API to Templater
- **Complexity:** ~2 hours (parser, API, testing)

**Next:** Report findings; expand spec if user wants implementation.

---

## Risks & Rollbacks

- **Calendar identification unclear:** May need to test with actual ICS files if code inspection insufficient
- **No examples directory:** Create under `docs/examples/` matching monorepo conventions
- **Filtering exists but poorly named:** Broad grep + read main plugin file thoroughly
- **Rollback:** All changes isolated to new example file; delete if approach wrong

---

**Confidence:** Concerned about Step 1 findings — calendar metadata tracking is TBD. Plan explicitly gates implementation on investigation results.
