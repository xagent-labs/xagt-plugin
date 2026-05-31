#!/usr/bin/env node
// TaxBot CLI — main entry point
import 'dotenv/config';
import { program } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';

import { OKXClient } from './okx-client.js';
import { fetchAllTransactions } from './fetcher.js';
import { classifyTransactions } from './classifier.js';
import { CostBasisEngine, findOptimalMethod } from './cost-basis.js';
import { scanHarvestingOpportunities } from './harvester.js';
import { generateForm8949, generateScheduleD, generateSchedule1 } from './pdf-generator.js';
import { publishAuditTrail, hashLedger } from './audit-trail.js';
import { getDemoTransactions, getDemo1099DA } from './demo-data.js';

program
  .name('taxbot')
  .description('The AI agent that fills your crypto taxes while you sleep')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate your crypto tax report')
  .option('--year <year>', 'Tax year', '2025')
  .option('--method <method>', 'Cost basis method: FIFO | LIFO | HIFO | AUTO', 'AUTO')
  .option('--output <dir>', 'Output directory', './output')
  .option('--demo', 'Run with demo data (no API key needed)')
  .action(async (opts) => {
    const taxYear = parseInt(opts.year);
    const outputDir = path.resolve(opts.output);
    fs.mkdirSync(outputDir, { recursive: true });

    console.log(chalk.bold.cyan('\n  TaxBot — Crypto Tax Agent'));
    console.log(chalk.gray('  The AI agent that fills your crypto taxes while you sleep\n'));

    const useDemo = opts.demo || !process.env.OKX_API_KEY;
    if (useDemo) {
      console.log(chalk.yellow('  ⚡ Running in DEMO mode (no API key detected)\n'));
    }

    // Step 1: Fetch transactions
    let spinner = ora('Connecting to OKX...').start();
    let rawTxs;

    if (useDemo) {
      await sleep(800);
      rawTxs = getDemoTransactions(taxYear);
      spinner.succeed(chalk.green(`OKX connected · ${rawTxs.length} demo transactions loaded`));
    } else {
      try {
        const client = new OKXClient({
          apiKey: process.env.OKX_API_KEY,
          secretKey: process.env.OKX_SECRET_KEY,
          passphrase: process.env.OKX_PASSPHRASE,
          demo: process.env.OKX_DEMO === 'true',
        });

        spinner.text = 'Fetching OKX spot trades...';
        rawTxs = await fetchAllTransactions(client, taxYear);
        spinner.succeed(chalk.green(`OKX data fetched · ${rawTxs.length} transactions found`));
      } catch (err) {
        spinner.fail(chalk.red(`OKX API error: ${err.message}`));
        console.log(chalk.yellow('\n  Falling back to demo data...\n'));
        rawTxs = getDemoTransactions(taxYear);
      }
    }

    // Step 2: Classify
    spinner = ora('Classifying transactions...').start();
    await sleep(300);
    const classified = classifyTransactions(rawTxs);
    const taxable = classified.filter(t => t.taxable);
    const income = classified.filter(t => t.taxType === 'ORDINARY_INCOME');
    spinner.succeed(chalk.green(`Classified ${classified.length} transactions · ${taxable.length} taxable events · ${income.length} income events`));

    // Step 3: Cost basis
    spinner = ora('Calculating cost basis...').start();
    await sleep(400);

    let disposals, method;
    if (opts.method === 'AUTO') {
      const result = findOptimalMethod(classified);
      disposals = result.disposals;
      method = result.method;
      const savings = result.allMethods['FIFO'].totalGain - result.totalGain;
      spinner.succeed(chalk.green(`Optimal method: ${chalk.bold(method)} · saves ${chalk.bold(fmt(savings))} vs FIFO`));
    } else {
      const engine = new CostBasisEngine(opts.method);
      disposals = engine.process(classified);
      method = opts.method;
      spinner.succeed(chalk.green(`Cost basis calculated using ${method}`));
    }

    // Step 4: Tax summary
    const capitalGains = disposals.filter(d => d.taxType === 'CAPITAL_GAIN');
    const stGains = capitalGains.filter(d => !d.isLongTerm).reduce((s, d) => s + (d.gainLoss || 0), 0);
    const ltGains = capitalGains.filter(d => d.isLongTerm).reduce((s, d) => s + (d.gainLoss || 0), 0);
    const ordinaryIncome = disposals.filter(d => d.incomeType === 'ORDINARY').reduce((s, d) => s + (d.gainLoss || d.proceeds || 0), 0);
    const netGain = stGains + ltGains;

    console.log(chalk.bold('\n  ── Tax Summary ──────────────────────────────────'));
    console.log(`  Short-term gains:   ${colorAmt(stGains)}`);
    console.log(`  Long-term gains:    ${colorAmt(ltGains)}`);
    console.log(`  Net capital gains:  ${colorAmt(netGain)}`);
    console.log(`  Ordinary income:    ${colorAmt(ordinaryIncome)}`);
    console.log(`  Total taxable:      ${chalk.bold(colorAmt(netGain + ordinaryIncome))}`);
    console.log(chalk.bold('  ─────────────────────────────────────────────────\n'));

    // Step 5: 1099-DA reconciliation (demo)
    if (useDemo) {
      const rec = getDemo1099DA();
      console.log(chalk.bold.yellow('  ⚠  1099-DA Reconciliation Alert'));
      console.log(`  ${rec.broker} reports: ${fmt(rec.reportedGain)} gain, ${fmt(rec.reportedBasis)} basis`);
      console.log(`  TaxBot calculates:  ${fmt(rec.taxbotGain)} gain, ${fmt(rec.taxbotBasis)} basis`);
      console.log(chalk.green(`  ✓ Recovered ${fmt(rec.discrepancy)} in missing cost basis — auto-adjusted on Form 8949`));
      console.log(chalk.gray(`  ${rec.explanation}\n`));
    }

    // Step 6: Tax-loss harvesting
    if (!useDemo && process.env.OKX_API_KEY) {
      spinner = ora('Scanning for tax-loss harvesting opportunities...').start();
      try {
        const client = new OKXClient({
          apiKey: process.env.OKX_API_KEY,
          secretKey: process.env.OKX_SECRET_KEY,
          passphrase: process.env.OKX_PASSPHRASE,
        });
        const opportunities = await scanHarvestingOpportunities(client, disposals);
        spinner.succeed(`Found ${opportunities.length} harvesting opportunities`);
        for (const opp of opportunities.slice(0, 3)) {
          console.log(chalk.yellow(`  💡 ${opp.action}`));
        }
      } catch {
        spinner.warn('Could not scan harvesting opportunities');
      }
    } else if (useDemo) {
      console.log(chalk.yellow('  💡 Tax-Loss Harvest: Sell 30 SOL → realize $600 loss → offset BTC gains → save ~$180'));
      console.log(chalk.gray('     No wash-sale rule for crypto (as of 2025). Can rebuy immediately.\n'));
    }

    // Step 7: Generate PDFs
    spinner = ora('Generating Form 8949...').start();
    const f8949 = await generateForm8949(disposals, outputDir, taxYear);
    spinner.succeed(chalk.green(`Form 8949 → ${path.relative(process.cwd(), f8949)}`));

    spinner = ora('Generating Schedule D...').start();
    const schedD = await generateScheduleD(disposals, outputDir, taxYear);
    spinner.succeed(chalk.green(`Schedule D → ${path.relative(process.cwd(), schedD)}`));

    spinner = ora('Generating Schedule 1...').start();
    const sched1 = await generateSchedule1(disposals, outputDir, taxYear);
    spinner.succeed(chalk.green(`Schedule 1 → ${path.relative(process.cwd(), sched1)}`));

    // Step 8: X Layer audit trail
    spinner = ora('Writing audit trail to X Layer...').start();
    const audit = await publishAuditTrail(disposals, process.env.XLAYER_PRIVATE_KEY);
    if (audit.skipped) {
      spinner.warn(chalk.gray(audit.reason));
    } else {
      spinner.succeed(chalk.green(`Audit trail published → ${audit.explorerUrl}`));
    }

    // Save JSON ledger
    const ledgerPath = path.join(outputDir, `taxbot_ledger_${taxYear}.json`);
    fs.writeFileSync(ledgerPath, JSON.stringify({ taxYear, method, disposals, summary: { stGains, ltGains, ordinaryIncome, netGain } }, null, 2));

    console.log(chalk.bold.green(`\n  ✅ Tax package ready in ${outputDir}/`));
    console.log(chalk.gray(`  Ledger hash: ${hashLedger(disposals)}\n`));
  });

program.parse();

function fmt(n) {
  if (n == null) return '$0.00';
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `($${abs})` : `$${abs}`;
}

function colorAmt(n) {
  const s = fmt(n);
  return n >= 0 ? chalk.green(s) : chalk.red(s);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
