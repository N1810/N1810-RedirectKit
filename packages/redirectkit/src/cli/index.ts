import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { exportToCsv, parseCsv } from '../import-export/csv.js';
import { loadProjectConfig, loadRedirects } from '../core/loader.js';
import { simulateRedirect } from '../core/matcher.js';
import type { Diagnostic, RedirectKitConfig } from '../core/types.js';
import { validateRedirects } from '../core/validator.js';

interface CliArgs {
  command?: string;
  subcommand?: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): CliArgs {
  const raw = argv.slice(2);
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  let command: string | undefined;

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (item.startsWith('--')) {
      const eqIndex = item.indexOf('=');
      if (eqIndex !== -1) {
        const key = item.slice(2, eqIndex);
        flags[key] = item.slice(eqIndex + 1);
      } else {
        const key = item.slice(2);
        const next = raw[i + 1];
        if (next && !next.startsWith('-')) {
          flags[key] = next;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (item.startsWith('-')) {
      const key = item.slice(1);
      const next = raw[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      if (!command) {
        command = item;
      } else {
        args.push(item);
      }
    }
  }

  return { command, args, flags };
}

function printHelp() {
  console.log(`
${pc.bold(pc.cyan('RedirectKit CLI'))} — Production-Ready Next.js Redirect Manager

${pc.bold('USAGE:')}
  $ redirectkit <command> [options]

${pc.bold('COMMANDS:')}
  ${pc.green('validate')}                Validate all redirect files against Next.js rules, cycles, and chains
  ${pc.green('list')}                    List all configured redirects with their source, destination, and status
  ${pc.green('check <path>')}            Simulate and trace the redirect path for a given URL
  ${pc.green('test')}                    Run comprehensive redirect health tests across all rules
  ${pc.green('import <file.csv>')}       Import and validate redirects from a CSV file into JSON
  ${pc.green('export <file.csv>')}       Export all configured redirects to a CSV file

${pc.bold('OPTIONS:')}
  ${pc.yellow('--strict')}                 Treat warnings as errors (ideal for CI)
  ${pc.yellow('--config <file>')}          Path to custom redirectkit.config.json
  ${pc.yellow('--dir <dir>')}              Path to redirects directory (defaults to "redirects")
  ${pc.yellow('--format <table|json>')}    Output format for list command (default: table)
  ${pc.yellow('--out <file>')}             Output destination file for import/export
  ${pc.yellow('--overwrite')}              Allow overwriting existing files during import
  ${pc.yellow('-h, --help')}               Show this help message
  ${pc.yellow('-v, --version')}            Show RedirectKit version
`);
}

function formatDiagnostic(d: Diagnostic): string {
  const badge =
    d.severity === 'error'
      ? pc.bgRed(pc.white(pc.bold(' ERROR ')))
      : d.severity === 'warning'
        ? pc.bgYellow(pc.black(pc.bold(' WARN ')))
        : pc.bgCyan(pc.black(pc.bold(' INFO ')));

  const location = d.file
    ? pc.dim(` [${d.file}${d.index !== undefined ? `:${d.index}` : ''}]`)
    : '';

  let out = `${badge} ${pc.bold(d.code)}${location}: ${d.message}`;
  if (d.suggestion) {
    out += `\n       ${pc.dim('↳ Suggestion:')} ${pc.cyan(d.suggestion)}`;
  }
  return out;
}

export async function runCli(argv: string[] = process.argv): Promise<number> {
  const { command, args, flags } = parseArgs(argv);

  if (flags.version || flags.v) {
    console.log('redirectkit v0.1.1');
    return 0;
  }

  if (flags.help || flags.h || !command) {
    printHelp();
    return 0;
  }

  const projectRoot = process.cwd();
  const configPath = typeof flags.config === 'string' ? flags.config : undefined;
  const { config: fileConfig, diagnostic: configDiag } = loadProjectConfig(projectRoot, configPath);

  const runtimeConfig: RedirectKitConfig = {
    ...fileConfig,
    redirectsDir: typeof flags.dir === 'string' ? flags.dir : fileConfig.redirectsDir,
    strict: Boolean(flags.strict || fileConfig.strict),
  };

  switch (command) {
    case 'validate': {
      console.log(
        pc.bold(`🔍 Validating redirects in ${runtimeConfig.redirectsDir || 'redirects'}...`)
      );

      const initialDiags = configDiag ? [configDiag] : [];
      const loaded = loadRedirects(projectRoot, runtimeConfig);
      initialDiags.push(...loaded.loadDiagnostics);

      const result = validateRedirects(loaded.rules, {
        config: runtimeConfig,
        initialDiagnostics: initialDiags,
      });

      console.log();
      for (const diag of result.diagnostics) {
        console.log(formatDiagnostic(diag));
      }

      console.log();
      console.log(pc.bold('Summary:'));
      console.log(`  Total Rules:  ${result.stats.totalRules}`);
      console.log(`  Files:        ${result.stats.filesCount}`);
      console.log(`  Cycles:       ${result.stats.cyclesCount}`);
      console.log(`  Chains:       ${result.stats.chainsCount}`);
      console.log(
        `  Errors:       ${result.stats.errorCount > 0 ? pc.red(result.stats.errorCount) : pc.green(0)}`
      );
      console.log(
        `  Warnings:     ${result.stats.warningCount > 0 ? pc.yellow(result.stats.warningCount) : pc.green(0)}`
      );

      if (result.valid) {
        console.log(pc.green(pc.bold('\n✔ Validation passed! All redirect rules are valid.')));
        return 0;
      } else {
        console.log(pc.red(pc.bold('\n✖ Validation failed! Please fix the errors above.')));
        return 1;
      }
    }

    case 'list': {
      const loaded = loadRedirects(projectRoot, runtimeConfig);
      if (flags.format === 'json') {
        console.log(JSON.stringify(loaded.rules, null, 2));
        return 0;
      }

      console.log(pc.bold(`\nLoaded ${loaded.rules.length} redirect rules:\n`));
      console.log(
        pc.dim('Source'.padEnd(35) + 'Destination'.padEnd(35) + 'Type'.padEnd(12) + 'Origin')
      );
      console.log(pc.dim('─'.repeat(95)));

      for (const r of loaded.rules) {
        const typeStr =
          r.statusCode !== undefined
            ? `${r.statusCode}`
            : r.permanent
              ? '308 (Perm)'
              : '307 (Temp)';

        const fileLabel = r._file || 'inline';
        console.log(
          r.source.padEnd(35) + r.destination.padEnd(35) + typeStr.padEnd(12) + pc.dim(fileLabel)
        );
      }
      return 0;
    }

    case 'check': {
      const targetPath = args[0];
      if (!targetPath) {
        console.error(
          pc.red('Error: Please provide a path to check, e.g. "redirectkit check /old-page"')
        );
        return 1;
      }

      const loaded = loadRedirects(projectRoot, runtimeConfig);
      const res = simulateRedirect(targetPath, loaded.rules);

      console.log(pc.bold(`\nSimulation for: ${pc.cyan(targetPath)}`));
      if (!res.matched) {
        console.log(
          pc.yellow('No redirect rule matched this path. Request passes through unchanged.')
        );
      } else {
        console.log(`Matched! Resulting destination: ${pc.green(pc.bold(res.finalDestination))}`);
        console.log(`Total Hops: ${res.hops}`);

        console.log(pc.bold('\nHop Trace:'));
        res.trace.forEach((hop, i) => {
          const status =
            hop.statusCode !== undefined
              ? `HTTP ${hop.statusCode}`
              : hop.permanent
                ? 'HTTP 308 (permanent)'
                : 'HTTP 307 (temporary)';
          console.log(
            `  ${i + 1}. ${hop.source} ${pc.dim('─(' + status + ')→')} ${pc.green(hop.destination)} ${pc.dim(
              hop.file ? `[${hop.file}]` : ''
            )}`
          );
        });

        if (res.loopDetected) {
          console.log(pc.red(pc.bold('\n⚠ INFINITE REDIRECT LOOP DETECTED during simulation!')));
        }
      }

      console.log(pc.dim('\nLimitations:'));
      for (const lim of res.limitations) {
        console.log(pc.dim(`  • ${lim}`));
      }

      return res.loopDetected ? 1 : 0;
    }

    case 'test': {
      console.log(pc.bold('Running RedirectKit automated rule tests...'));
      const loaded = loadRedirects(projectRoot, runtimeConfig);
      const result = validateRedirects(loaded.rules, {
        config: { ...runtimeConfig, strict: true },
      });

      if (result.valid) {
        console.log(
          pc.green(`✔ All ${result.stats.totalRules} redirect rules passed test suite cleanly.`)
        );
        return 0;
      } else {
        console.error(
          pc.red(`✖ Redirect rule test suite failed with ${result.errors.length} error(s).`)
        );
        for (const e of result.errors) {
          console.error(formatDiagnostic(e));
        }
        return 1;
      }
    }

    case 'import': {
      const csvFile = args[0];
      if (!csvFile) {
        console.error(
          pc.red('Error: Please specify a CSV file to import, e.g. "redirectkit import file.csv"')
        );
        return 1;
      }

      const resolvedCsv = path.resolve(projectRoot, csvFile);
      if (!fs.existsSync(resolvedCsv)) {
        console.error(pc.red(`Error: CSV file not found at ${resolvedCsv}`));
        return 1;
      }

      const content = fs.readFileSync(resolvedCsv, 'utf-8');
      const { rules, diagnostics } = parseCsv(content, path.basename(csvFile));

      const errors = diagnostics.filter(d => d.severity === 'error');
      if (errors.length > 0) {
        console.error(pc.red(`Failed to parse CSV with ${errors.length} error(s):`));
        for (const err of errors) {
          console.error(formatDiagnostic(err));
        }
        return 1;
      }

      // Validate imported rules before writing
      const validation = validateRedirects(rules, { config: runtimeConfig });
      if (!validation.valid) {
        console.error(pc.red(`Imported rules failed validation:`));
        for (const err of validation.errors) {
          console.error(formatDiagnostic(err));
        }
        return 1;
      }

      // Determine output JSON file
      const outPath = flags.out
        ? path.resolve(projectRoot, String(flags.out))
        : path.resolve(
            projectRoot,
            runtimeConfig.redirectsDir || 'redirects',
            `${path.parse(csvFile).name}.json`
          );

      if (fs.existsSync(outPath) && !flags.overwrite) {
        console.error(
          pc.red(
            `Error: Destination file "${outPath}" already exists. Use --overwrite to replace it.`
          )
        );
        return 1;
      }

      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(rules, null, 2) + '\n', 'utf-8');
      console.log(
        pc.green(
          `✔ Successfully imported ${rules.length} redirects to ${path.relative(projectRoot, outPath)}`
        )
      );
      return 0;
    }

    case 'export': {
      const outCsvFile = args[0] || (typeof flags.out === 'string' ? flags.out : 'redirects.csv');
      const resolvedOut = path.resolve(projectRoot, outCsvFile);

      const loaded = loadRedirects(projectRoot, runtimeConfig);
      if (loaded.rules.length === 0) {
        console.log(pc.yellow('No redirect rules found to export.'));
        return 0;
      }

      const csvContent = exportToCsv(loaded.rules);
      fs.writeFileSync(resolvedOut, csvContent, 'utf-8');
      console.log(
        pc.green(`✔ Successfully exported ${loaded.rules.length} redirects to ${outCsvFile}`)
      );
      return 0;
    }

    default: {
      console.error(pc.red(`Unknown command: "${command}"`));
      printHelp();
      return 1;
    }
  }
}

// Auto-run if executed directly as script
if (
  process.argv[1] &&
  (process.argv[1].endsWith('cli.js') || process.argv[1].endsWith('redirectkit.js'))
) {
  runCli().then(code => {
    if (code !== 0) {
      process.exit(code);
    }
  });
}
