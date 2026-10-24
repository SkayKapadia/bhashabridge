# BhashaBridge in Simple Words

October 24, 2026

> Local copy of the shared doc: https://claude.ai/code/artifact/771c172a-2da4-4c7e-81f1-a4bfcee56203

## The problem

Many talented developers in Gujarat understand code well but lose the thread when an AI tool explains a bug in three paragraphs of dense English. Reading a second language and thinking about the fix at the same time is twice the work. It slows learning and quietly says that these tools were not built for them.

## The idea

BhashaBridge is a small add-on for VS Code that turns an AI's English explanation into Gujarati, while every piece of code and every technical word stays exactly as it was. You read the explanation in the language you think in, and you still see the English words you will search for, read in documentation and type in your code.

## An example

The meaning changes language; the code and the technical words do not.

**What the AI said:**

> The `useEffect` hook runs after every render. Add an empty dependency array so that `loadData()` is called only once.

**In Gujarati with BhashaBridge:**

> `useEffect` hook દરેક render પછી ચાલે છે. ખાલી dependency array ઉમેરો જેથી `loadData()` ફક્ત એક જ વાર call થાય.

*(Illustrative. Real output depends on the translation service.)*

## How it keeps code safe

BhashaBridge hides the code before anything is translated, so the translator never even sees it. Think of covering each line of code with a numbered sticker before handing the page to a translator, then peeling the stickers off afterwards.

1. **Cover:** every code block, every bit of code in backticks, and every code line is swapped for a numbered sticker such as `SKIP_001`.
2. **Cover the technical words too:** words like *array*, *API* or *callback* get stickers as well, so they stay in English.
3. **Translate:** only the explanation, with its stickers, goes to the translator.
4. **Check and uncover:** BhashaBridge checks that every sticker came back exactly once, then puts the original code back, letter for letter. If a sticker is missing, you get a clear error instead of an answer with code missing.

## Who it is for

- **Students and junior developers** in Gujarat, especially in smaller cities, who use tools like GitHub Copilot or ChatGPT and struggle with long English explanations.
- **Self-taught developers** from non-English-medium schools who understand the logic but grasp it faster in their own language.
- **Developers building software for other fields**, such as healthcare, banking or supply chain, who meet that field's jargon too.
- **Teachers and bootcamps** who want students to learn concepts first and the English vocabulary along the way.

## How people use it

There are three ways to use it, and none needs more than one or two steps.

- **Shortcut:** select an AI answer, or copy it, and press **Ctrl+Alt+Shift+T** (Cmd+Alt+Shift+T on a Mac). The translation appears in a side panel.
- **Panel:** open BhashaBridge, paste the text, and click Translate.
- **Chat:** if you use GitHub Copilot, type `@bhashabridge why does this crash?` in the Chat view and get the answer in your language.

**Learning as you go:** click any translated paragraph to see the original English under it, or turn on *Side by side* to read both together. Some business terms also show their meaning the first time they appear, for example "ledger (ખાતાવહી)".

**When something reads wrong:** the *Report translation* button opens a ready-made GitHub issue, so the word lists and wording can be improved over time.

## Privacy and cost

Your code never leaves your computer: only the explanation text, with the code hidden, is sent to the translation service you choose.

- **No BhashaBridge server and no tracking.** It is open source, so anyone can check what it does.
- **Your own key:** you bring your own Sarvam AI key, stored in your computer's secure keychain, never in a file. Copilot users can use their Copilot model instead, with no extra key.
- **Low cost:** an estimated ₹0.20 to ₹0.30 for a typical five-paragraph answer with Sarvam AI, so about ₹100 covers several hundred translations. Translating the same text again is free, because recent translations are saved on your computer.

## Why not just ask the AI to answer in Gujarati?

You can, but nothing then stops the AI from translating a variable name or changing a line of code, and it may use a different word for the same term each time.

| | Asking an AI to answer in Gujarati | BhashaBridge |
| --- | --- | --- |
| Code | May be changed or translated | Hidden before translation, put back exactly |
| Technical words | Translated or kept at random | Same treatment every time, from a shared word list |
| Works with | One tool at a time | Any AI tool: copy, select or paste |
| Learning | One language only | Click to see the English; side-by-side view |
| Effort | A new request in every chat | Your usual tool and prompts stay as they are |

## Where it is today

BhashaBridge is available now, free, on the VS Code Marketplace as **"BhashaBridge: AI Explanations in Indian Languages"** (version 0.1.1, preview). Search "BhashaBridge" in VS Code's Extensions view, or open [its Marketplace page](https://marketplace.visualstudio.com/items?itemName=SunilKapadia.bhashabridge).

- **Done:** Gujarati, Sarvam AI and Copilot as translators, the panel, the shortcut, the chat, learning mode, and a word list of about 1,580 technical terms across software and 17 business fields. Every change is tested automatically before it is accepted.
- **Next:** native speakers review the remaining Gujarati word meanings and score sample translations.
- **Later:** more languages added by contributors, such as Hindi, Kannada, Tamil and Telugu (a step-by-step guide shows them how); more translation services, including a free one for students; and translating error messages straight from the terminal.
