# Science and AI Prompts

> 📌 **TL;DR**: This folder contains the scientific logic and AI instructions that power the animal welfare analysis in the Welfare Footprint Scanner App.

Welcome! This folder powers the brain of the **Welfare Footprint Scanner App** — housing the scientific logic and AI prompt templates used to analyze food products and infer animal welfare impacts.

This document explains the purpose, structure, and usage of the prompt and guideline files that support the App's backend logic.

---

## 📁 What's Inside

This folder contains two key types of files:

- **AI Prompt Templates** – Instructions that guide how the AI models analyze food images and generate welfare assessments.
- **Scientific Guidelines** – Frameworks that ensure assessments are grounded in transparent, evidence-based science.


Some of these files are quite fun to explore — like [`ethical_lens_criteria.md`](ethical_lens_criteria.md) or [`welfare_concerns_framework.md`](welfare_concerns_framework.md), which dive into how moral priorities and welfare issues are handled. Others are definitely on the geekier side and might feel a bit dry unless you're into AI prompts or backend logic.

I’ll try to organize things better soon, but for now, sorry if it feels a bit all over the place. Poke around, skip what’s boring, and let me know if anything seems confusing or sparks ideas.

---


## 📄 Files in This Folder

### AI Prompt Templates

These files contain natural-language instructions that guide the AI when analyzing food products:

#### [`detect_items.md`](detect_items.md)
Guides the AI in identifying multiple food items in a single photo (e.g., meals, grocery hauls). Each item is listed with a basic animal-derived ingredient check.

#### [`analyze_product.md`](analyze_product.md)
The main analysis engine. When a product is scanned, this prompt directs the AI to assess:
- What the product is
- Which animal-derived ingredients it may contain
- How those animals were likely raised
- Relevant welfare concerns

#### [`analyze_focused_item.md`](analyze_focused_item.md)
Used when a specific item is selected from a multi-item photo. The AI focuses solely on that item.

#### [`suggest_ethical_swap.md`](suggest_ethical_swap.md)
Recommends alternative products based on the user’s ethical preferences. Helps users find options aligned with their priorities.

---

### Scientific Guidelines

These define the scientific standards, classification rules, and ethical lenses used by the prompts:

#### [`animal_ingredient_classification.md`](animal_ingredient_classification.md)
Explains how the AI categorizes ingredients as animal-derived or not. Covers ambiguous and additive cases.

#### [`confidence_level_guidelines.md`](confidence_level_guidelines.md)
Outlines when the AI should express high, medium, or low confidence — supporting transparent communication of uncertainty.

#### [`ethical_lens_criteria.md`](ethical_lens_criteria.md)
Defines the five moral viewpoints available to users (e.g., “Reduce Extreme Suffering” to “Avoid All Animal Use”), and how each alters the assessment logic.

#### [`production_system_methodology.md`](production_system_methodology.md)
Provides heuristics for inferring production systems (e.g., conventional, pasture-raised, organic) from product metadata.

#### [`welfare_concerns_framework.md`](welfare_concerns_framework.md)
Maps species and production systems to likely welfare concerns — e.g., confinement, mutilations, transport, slaughter conditions.

---

## ✍️ How to Suggest Edits (No Programming Required)

If you notice something unclear, outdated, or scientifically questionable:

- **Quick Suggestions**  
  Send edits or comments directly to **Wladimir**. All suggestions will be reviewed.

- **Larger Revisions**  
  Copy the file into a **Google Doc**, enable **Suggesting mode**, and share it for collaborative review.

---

## 🧬 Relation to the Welfare Footprint Framework

This app is a front-end prototype for insights that eventually will be grounded in the **Welfare Footprint Framework (WFF)**. But for now it serves as a **testing ground** to ensure the AI-powered system aligns with reasonable welfare standards — and as a vehicle for public communication of welfare information.

Even in its current stage, this tool lets us:

- Prototype how affective-state data can be communicated to lay users
- Test public engagement with different **Ethical Lens** framings
- Experiment with natural language prompts for clarity and emotional resonance
- Gather feedback to improve both **AI logic** and **scientific grounding**

---

💬 **Your input matters**  
Suggestions on wording, design, ethics, or scientific clarity are all welcome and appreciated.


---

## 👩‍🔬 For Scientists: All You Need Is Above This Line

---






## 🧑‍💻 Developer Reference (Prompt Engineers Only)



### 🔍 Why keeping prompts and scientific logic separate from application code Matters

 It ensures:

- **Transparency** – Anyone can review how the AI makes decisions.
- **Easy Updates** – Scientists can improve the analysis without needing to touch the code.
- **Version Tracking** – Every change is documented in the project history.
- **Shareability** – Prompts and criteria can be published or cited in academic work.
- **Model Flexibility** – Templates work across multiple AI models.

---

### File Structure

Each prompt file follows this layout:



```
================================================================================
PROMPT: [Prompt Name]
================================================================================

PURPOSE:
[Description of what this prompt does]

EXPECTED INPUTS:
- Input 1: Description
- Input 2: Description
...

EXPECTED OUTPUT FORMAT:
[JSON schema or output format description]

MODEL COMPATIBILITY:
[Which AI models this works with]

VERSIONING:
Version X.X - [Description]
Last updated: YYYY-MM-DD

================================================================================
PROMPT TEXT BEGINS BELOW:
================================================================================

[Actual prompt text that gets sent to the AI model]
```

### Template Variables

Prompts support template variables using `{{VARIABLE_NAME}}` syntax:

### Simple Variables
```
{{LANGUAGE}} - Output language (e.g., "English", "Spanish")
{{FOCUS_ITEM}} - Specific item to analyze (e.g., "Crispy chicken stir-fry")
{{USER_CORRECTION}} - User's correction to AI interpretation
```

#### Conditional Blocks
```
{{#if VARIABLE_NAME}}
  This content only appears if VARIABLE_NAME is truthy
{{/if}}
```

### Usage in Code

#### Loading a Prompt

```typescript
import { loadAndProcessPrompt } from "../_shared/prompt-loader.ts";

// Load with variables
const prompt = await loadAndProcessPrompt('detect_items', {
  LANGUAGE: 'English',
  USER_CORRECTION: 'This is tofu, not chicken'
});
```

#### In Edge Functions

The `analyze-image` edge function automatically loads the appropriate prompt based on mode:

- `mode: 'detect'` → `detect_items.md`
- `mode: 'analyze'` with `focusItem` → `analyze_focused_item.md`
- `mode: 'analyze'` without `focusItem` → `analyze_product.md`


### For Researchers and Publications

All files in this folder are designed to be:
- **Citable** - Reference specific versions using git commit history
- **Exportable** - Copy and paste directly into research papers
- **Transparent** - Every assumption and decision rule is documented

### Model-Specific Considerations

While prompts are model-agnostic, be aware of:

- **Token Limits** - Different models have different context windows
- **JSON Mode** - Some models require `response_mime_type: "application/json"`
- **Temperature** - May need adjustment per model for consistency
- **Vision Capabilities** - Ensure model supports image input

### Troubleshooting

#### Prompt Not Loading
- Check file path in `prompt-loader.ts`
- Verify file exists in `/science_and_ai_prompts` directory
- Check for syntax errors in template variables

#### Variables Not Substituting
- Ensure variable name matches exactly (case-sensitive)
- Check for typos in `{{VARIABLE_NAME}}`
- Verify variable is passed in the variables object

#### Unexpected Output
- Review prompt clarity and specificity
- Check JSON schema requirements
- Test with multiple images
- Consider model-specific behavior


