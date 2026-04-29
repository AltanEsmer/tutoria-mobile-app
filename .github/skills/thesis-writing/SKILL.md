---
name: thesis-writing
description: |
  Expert assistant for writing SDU bachelor thesis sections in plain text format. Covers all chapters of the Software Engineering bachelor project report: Abstract, Introduction, Project Background, Problem Statement, Proposed Solution, Implementation, Software Engineering Practices, Discussion, Conclusion, and Appendix. Use when drafting, expanding, or reviewing any thesis chapter or section.
---

# Thesis Writing — SDU Bachelor Project

This skill assists with writing and structuring all sections of the SDU Software Engineering Bachelor Project thesis, authored in plain text (.txt) format.

---

## Project Context

- **Institution:** University of Southern Denmark (SDU)
- **Programme:** Software Engineering, 6th Semester
- **Format:** Plain text (.txt files)
- **Location:** `thesis/` directory in project root
- **File structure:** Each chapter in its own `.txt` file
- **Bibliography:** References tracked in `thesis/references.txt`

---

## Chapter Structure

The thesis is divided into the following chapters, each in its own `.txt` file under `thesis/`:

| File | Chapter |
|---|---|
| `Abstract.txt` | Abstract (front matter) |
| `Introduction.txt` | 1. Introduction |
| `Project_Background.txt` | 2. Project Background |
| `Problem.txt` | 3. Problem Statement |
| `Solution.txt` | 4. Proposed Solution |
| `Implementation.txt` | 5. Implementation |
| `SE.txt` | 6. Software Engineering Practices |
| `Discussion.txt` | 7. Discussion |
| `Conclusion.txt` | 8. Conclusion |
| `Appendix.txt` | Appendix A |

---

## Chapter Guidelines

### Abstract (`Abstract.tex`)
- Concise summary of the entire thesis (typically 150–250 words).
- Covers: motivation, problem, approach, key results, and conclusions.
- No citations or figures.

### Introduction (`chap:intro`)
- **Suggested length:** 1–1.5 pages.
- Set the scene: explain the purpose and significance of the project.
- Provide an overview of the problem addressed.
- Briefly introduce the selected solution and how it fits the project context.
- Explain the structure of the report to guide the reader.

### Project Background (`chap:background`)
- Establish domain knowledge the reader needs before understanding the problem.
- Cover relevant technologies, prior work, related systems, or theoretical foundations.
- Use citations (`\cite{}`) to reference academic sources.
- Include figures and tables where they aid understanding (`\ref{fig:...}`, `\ref{tab:...}`).

### Problem Statement (`chap:problem`)
- Introduce and justify the selected problem.
- Argue for the relevance of the problem and why it needs to be addressed.
- Discuss the benefits of investigating it and the cost of not addressing it.
- End with a clearly stated, focused problem definition.

### Proposed Solution (`chap:Solution`)
- Describe the designed solution at a conceptual level.
- Explain design decisions and trade-offs.
- Use diagrams (architecture, flow charts, UML) referenced with `\ref{fig:...}`.
- Connect directly back to the problem statement.

### Implementation (`chap:implementation`)
- Describe *how* the solution was built.
- Cover key technical components, algorithms, data structures, or integrations.
- Include relevant code listings using the `listings` package (`\begin{lstlisting}`).
- Reference the system architecture and relate implementation choices to the design.

### Software Engineering Practices (`chap:SE`)
- Document the software engineering process used throughout the project.
- Cover: development methodology (e.g., Scrum, Kanban), version control strategy, testing approach, CI/CD, and project management.
- Use Gantt charts (`pgfgantt`) if applicable to show the project timeline.
- Reflect on how SE practices contributed to or challenged the project.

### Discussion (`chap:discussion`)
- Critically evaluate results against the problem statement.
- Discuss limitations, unexpected challenges, and deviations from the original plan.
- Compare with related work where relevant.
- Propose future improvements or extensions.

### Conclusion (`chap:conclude`)
- Summarise what was achieved relative to the original goals.
- Restate the problem and briefly recap the solution and key findings.
- Do not introduce new material.
- End with a forward-looking statement about impact or future work.

### Appendix A (`Appendix.tex`)
- Supplementary material too detailed for the main body (e.g., full API specs, user study raw data, configuration files, extended code listings).
- Reference from the main text using `\ref{chap:appendix}` or specific section labels.

---

## Text Formatting Conventions

### Section Structure
```
# Chapter Title

## Section Title

### Subsection Title

#### Subsubsection Title (if needed)
```

### Lists
```
Unordered lists:
- Item 1
- Item 2
  - Nested item 2a
  - Nested item 2b

Numbered lists:
1. First item
2. Second item
   a. Nested item 2a
   b. Nested item 2b
```

### References
- Use [1], [2], etc. for inline citations (refer to thesis/references.txt for full entries)
- Format: "As noted in research [1], the approach shows promise."
- Multiple: "Studies [1, 2, 3] confirm this finding."

### Code Blocks
```
Code example (plain text):

    def calculate_score(input):
        return input * 2

```

### Tables
Use simple ASCII formatting:

```
┌─────────────────┬──────────────────┐
│ Column 1        │ Column 2         │
├─────────────────┼──────────────────┤
│ Data            │ Data             │
│ More data       │ More data        │
└─────────────────┴──────────────────┘
```

Or simpler format (tab or space-aligned):
```
Column 1        Column 2
─────────────── ──────────────────
Data            Data
More data       More data
```

### Figures/Images
Reference external images:
```
[Figure 1: Architecture diagram - see images/architecture.png]
[Figure 2: Flow chart - see images/flow.png]
```

---

## Writing Style Guidelines

- Write in **third person**, past or present tense consistently within sections.
- Use **active voice** where possible: "The system sends a request" not "A request is sent."
- Define all acronyms on first use: "Near Field Communication (NFC)".
- Every figure and table **must** be referenced in the body text before it appears.
- Avoid orphaned sections — every `\section` should have introductory text before its first `\subsection`.
- Keep paragraphs focused: one idea per paragraph.
- Use `\noindent` after block environments (figures, tables) to avoid unwanted indentation.

---

## Common Workflow

1. Identify which chapter file to edit: `thesis/<ChapterName>.txt`
2. Draft the section content following the chapter guidelines above.
3. Use markdown-style headings (# ## ###) for structure.
4. Add inline citations [N] referencing thesis/references.txt entries.
5. When writing is complete, the text can be converted to PDF or other formats as needed.
