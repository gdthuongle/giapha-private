import { spawnSync } from "node:child_process";

type Step = {
  name: string;
  command: string[];
};

const steps: Step[] = [
  {
    name: "Route audit",
    command: ["bun", "run", "audit:routes"],
  },
  {
    name: "Migration audit",
    command: ["bun", "run", "audit:migrations"],
  },
  {
    name: "Unit tests",
    command: ["bun", "run", "test"],
  },
  {
    name: "Production build",
    command: ["bun", "run", "build"],
  },
];

function runStep(step: Step) {
  console.log(`\n=== ${step.name} ===`);
  console.log(`$ ${step.command.join(" ")}\n`);

  const result = spawnSync(step.command[0], step.command.slice(1), {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`\n${step.name} failed to start: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`\n${step.name} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

function main() {
  console.log("\n=== Release Check v2.4.0 ===");

  for (const step of steps) {
    runStep(step);
  }

  console.log("\n=== Release Check Passed ===");
  console.log("All release checks passed.");
}

main();