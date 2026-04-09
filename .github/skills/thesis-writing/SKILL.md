---
name: thesis-writing
description: Expert assistant for writing SDU bachelor thesis sections in LaTeX. Covers all chapters of the Software Engineering bachelor project report: Abstract, Introduction, Project Background, Problem Statement, Proposed Solution, Implementation, Software Engineering Practices, Discussion, Conclusion, and Appendix. Use when drafting, expanding, or reviewing any thesis chapter or section.
---

# Thesis Writing — SDU Bachelor Project

This skill assists with writing and structuring all sections of the SDU Software Engineering Bachelor Project thesis, authored in LaTeX using the SDU 2025 report template.

---

## Project Context

- **Institution:** University of Southern Denmark (SDU)
- **Programme:** Software Engineering, 6th Semester
- **Document class:** `report` (11pt, A4, two-sided)
- **Template:** SDU Software Engineering Course 2025 template
- **Main file:** `main.tex` — includes all chapter files from `Chapters/`
- **Bibliography:** `abbrv` style, stored in `references.bib`

---

## Chapter Structure

The thesis is divided into the following chapters, each in its own `.tex` file under `Chapters/`:

| File | Chapter | Label |
|---|---|---|
| `Abstract.tex` | Abstract (front matter) | — |
| `Introduction.tex` | 1. Introduction | `chap:intro` |
| `Project_Background.tex` | 2. Project Background | `chap:background` |
| `Problem.tex` | 3. Problem Statement | `chap:problem` |
| `Solution.tex` | 4. Proposed Solution | `chap:Solution` |
| `Implementation.tex` | 5. Implementation | `chap:implementation` |
| `SE.tex` | 6. Software Engineering Practices | `chap:SE` |
| `Discussion.tex` | 7. Discussion | `chap:discussion` |
| `Conclusion.tex` | 8. Conclusion | `chap:conclude` |
| `Appendix.tex` | Appendix A | — |

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

## LaTeX Conventions

### Structure
```latex
\section{Section Title}
\subsection{Subsection Title}
\subsubsection{Subsubsection Title}
```

### Figures
```latex
\begin{figure}[htbp]
  \centering
  \includegraphics[width=0.8\textwidth]{Images/filename.png}
  \caption{A descriptive caption.}
  \label{fig:unique-label}
\end{figure}
```
Reference with: `Figure~\ref{fig:unique-label}`

### Tables
```latex
\begin{table}[htbp]
  \centering
  \begin{tabular}{lll}
    \toprule
    Column 1 & Column 2 & Column 3 \\
    \midrule
    Data & Data & Data \\
    \bottomrule
  \end{tabular}
  \caption{A descriptive caption.}
  \label{tab:unique-label}
\end{table}
```
Reference with: `Table~\ref{tab:unique-label}`

### Code Listings
```latex
\begin{lstlisting}[language=Python, caption={Description}, label={lst:label}]
# code here
\end{lstlisting}
```

### Citations
- Single: `\cite{authorYYYYkeyword}`
- Multiple: `\cite{author1,author2}`
- Non-breaking space before cite: `text~\cite{ref}`

### Cross-references
- Always use `~\ref{}` (non-breaking space) for figures, tables, sections.
- Use `\label{}` immediately after `\chapter{}`, `\section{}`, `\begin{figure}`, etc.

### Nomenclature
Add entries with `\nomenclature{SYMBOL}{Definition}` and they appear in the nomenclature list.

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

1. Identify which chapter file to edit: `Chapters/<ChapterName>.tex`
2. Draft the section content following the chapter guidelines above.
3. Add `\label{}` to all new sections, figures, and tables.
4. Add any new bibliography entries to `references.bib`.
5. Compile with: `pdflatex main.tex` → `bibtex main` → `pdflatex main.tex` × 2.
