import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const categories = JSON.parse(fs.readFileSync(path.join(root, "src/data/categories.json"), "utf8"));
const errors = [];
const ids = new Set();

function assert(condition, message) {
  if (!condition) errors.push(message);
}

assert(categories.length === 5, "categories.json must contain exactly 5 chapters.");

for (const category of categories) {
  const filePath = path.join(root, `src/data/question-bank/${category.id}.json`);
  assert(fs.existsSync(filePath), `${category.id}.json does not exist.`);
  if (!fs.existsSync(filePath)) continue;

  const questions = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert(Array.isArray(questions), `${category.id}.json must be an array.`);
  assert(questions.length === 10, `${category.id}.json must contain exactly 10 questions.`);

  for (const [index, question] of questions.entries()) {
    assert(!ids.has(question.id), `Duplicate question id: ${question.id}`);
    ids.add(question.id);
    assert(question.category === category.id, `${question.id} category must be ${category.id}.`);
    assert(question.level1, `${question.id} is missing level1.`);
    assert(question.level2, `${question.id} is missing level2.`);
    assert(question.level3, `${question.id} is missing level3.`);
    assert(question.pdfOutput, `${question.id} is missing pdfOutput.`);
    assert(Array.isArray(question.framework), `${question.id} framework must be an array.`);
    assert(Array.isArray(question.tags), `${question.id} tags must be an array.`);

    const nextId = questions[index + 1]?.id;
    if (nextId) {
      assert(question.nextQuestion.includes(nextId), `${question.id} nextQuestion should include ${nextId}.`);
    } else {
      assert(question.nextQuestion.length === 0, `${question.id} is the final chapter question and should not have nextQuestion.`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("QuestionBank validation passed: 5 chapters x 10 questions.");
