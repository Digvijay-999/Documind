import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

import { RagService } from '../src/services/rag.service';
import { UsageService } from '../src/services/usage.service';
import prisma from '../src/utils/prisma';
import mongoose from 'mongoose';
import { connectRedis, redisClient } from '../src/config/redis';

// Types
interface EvalCase {
  id: string;
  category: string;
  question: string;
  expectedConcepts: string[];
  documentId: string;
}

interface EvalResult {
  id: string;
  question: string;
  expectedConcepts: string[];
  actualAnswer: string;
  score: number; // 0 to 1
  status: 'PASS' | 'PARTIAL' | 'FAIL';
  latencyMs: number;
}

async function runEvals() {
  console.log('--- Starting DocuMind AI Evals ---');
  
  // Try to connect to Redis but don't fail if we can't
  await connectRedis();

  const questionsPath = path.join(__dirname, 'questions.json');
  const questions: EvalCase[] = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));
  
  // We need a document ID to evaluate. For the purposes of this evaluation script, 
  // we require a specific document ID to be passed or hardcoded.
  // The user should upload a document about FastAPI and provide its ID.
  const EVAL_DOC_ID = process.argv[2] || 'EVAL_DOC_ID';
  const EVAL_USER_ID = process.argv[3] || 'EVAL_USER_ID';

  if (EVAL_DOC_ID === 'EVAL_DOC_ID') {
    console.warn('\nWARNING: You are using the default document ID (EVAL_DOC_ID).');
    console.warn('Please run: npm run evaluate <documentId> <userId>\n');
  }

  const ragService = new RagService();
  const results: EvalResult[] = [];
  
  let totalLatency = 0;
  let passedCount = 0;
  let partialCount = 0;
  let failedCount = 0;

  for (const q of questions) {
    console.log(`\nEvaluating [${q.id}]: ${q.question}`);
    const start = Date.now();
    let answer = '';
    
    try {
      answer = await ragService.answerQuestion(EVAL_USER_ID, EVAL_DOC_ID, q.question);
    } catch (err: any) {
      console.error(`Error answering ${q.id}:`, err.message);
      answer = 'ERROR';
    }
    const latency = Date.now() - start;
    totalLatency += latency;

    // Scoring logic
    let matchedConcepts = 0;
    const answerLower = answer.toLowerCase();
    
    for (const concept of q.expectedConcepts) {
      if (answerLower.includes(concept.toLowerCase())) {
        matchedConcepts++;
      }
    }
    
    const score = q.expectedConcepts.length > 0 ? matchedConcepts / q.expectedConcepts.length : 1;
    let status: 'PASS' | 'PARTIAL' | 'FAIL' = 'FAIL';
    
    if (score >= 0.7) status = 'PASS';
    else if (score >= 0.4) status = 'PARTIAL';
    else status = 'FAIL';

    if (status === 'PASS') passedCount++;
    else if (status === 'PARTIAL') partialCount++;
    else failedCount++;

    console.log(`Status: ${status} (Score: ${score.toFixed(2)}) - Latency: ${latency}ms`);
    
    results.push({
      id: q.id,
      question: q.question,
      expectedConcepts: q.expectedConcepts,
      actualAnswer: answer,
      score,
      status,
      latencyMs: latency
    });
    
    // Add a small delay to respect rate limits if needed
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const avgLatency = totalLatency / questions.length;
  const passRate = (passedCount / questions.length) * 100;

  console.log('\n========================================');
  console.log('DocuMind RAG Evaluation Results');
  console.log('========================================');
  console.log(`Total cases: ${questions.length}`);
  console.log(`Passed:      ${passedCount}`);
  console.log(`Partial:     ${partialCount}`);
  console.log(`Failed:      ${failedCount}`);
  console.log(`Pass rate:   ${passRate.toFixed(1)}%`);
  console.log(`Avg Latency: ${(avgLatency / 1000).toFixed(2)}s`);
  
  // Note: Tokens are not exposed easily from our current standard RagService answer logic
  // unless we specifically hook into UsageService. This is an approximation.
  
  const resultsData = {
    summary: {
      totalCases: questions.length,
      passed: passedCount,
      partial: partialCount,
      failed: failedCount,
      passRate: `${passRate.toFixed(1)}%`,
      averageLatencyMs: avgLatency
    },
    results
  };

  fs.writeFileSync(
    path.join(__dirname, 'results.json'),
    JSON.stringify(resultsData, null, 2)
  );
  console.log('\nDetailed results saved to evals/results.json');

  if (redisClient.isOpen) {
    await redisClient.disconnect();
  }
  await prisma.$disconnect();
  await mongoose.disconnect();
}

runEvals().catch(console.error);
