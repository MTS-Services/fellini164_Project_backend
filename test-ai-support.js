/**
 * Test script for AI Support System
 * Run with: node test-ai-support.js
 */

const axios = require("axios");

const API_BASE_URL = process.env.API_URL || "http://localhost:5000/api/v1";

// Test configuration
const tests = {
  startConversation: true,
  continueConversation: true,
  searchKnowledge: true,
  getQuickHelp: true,
  escalate: false, // Set to true to test escalation
};

let conversationId = null;

async function testStartConversation() {
  console.log("\n📝 Testing: Start Support Conversation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const response = await axios.post(`${API_BASE_URL}/support/chat/start`, {
      message: "How do I upgrade my subscription plan?",
    });

    if (response.data.success) {
      console.log("✅ Conversation started successfully");
      conversationId = response.data.data.conversationId;
      console.log("📋 Conversation ID:", conversationId);
      console.log(
        "🤖 AI Response:",
        response.data.data.message.substring(0, 200) + "...",
      );
      console.log("🎯 Should Escalate:", response.data.data.shouldEscalate);
      return true;
    } else {
      console.log("❌ Failed to start conversation");
      return false;
    }
  } catch (error) {
    console.log("❌ Error:", error.response?.data?.message || error.message);
    return false;
  }
}

async function testContinueConversation() {
  if (!conversationId) {
    console.log("\n⚠️  Skipping: Continue Conversation (no conversation ID)");
    return false;
  }

  console.log("\n📝 Testing: Continue Conversation");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const response = await axios.post(`${API_BASE_URL}/support/chat/continue`, {
      conversationId,
      message: "What are the differences between Starter and Pro plans?",
    });

    if (response.data.success) {
      console.log("✅ Message sent successfully");
      console.log(
        "🤖 AI Response:",
        response.data.data.message.substring(0, 200) + "...",
      );
      return true;
    } else {
      console.log("❌ Failed to continue conversation");
      return false;
    }
  } catch (error) {
    console.log("❌ Error:", error.response?.data?.message || error.message);
    return false;
  }
}

async function testSearchKnowledge() {
  console.log("\n📝 Testing: Search Knowledge Base");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const response = await axios.get(
      `${API_BASE_URL}/support/knowledge/search`,
      {
        params: {
          query: "billing",
          category: "billing",
        },
      },
    );

    if (response.data.success) {
      console.log("✅ Knowledge base search successful");
      console.log("📚 Results found:", response.data.data.length);
      if (response.data.data.length > 0) {
        console.log("📖 First result:", response.data.data[0].question);
      }
      return true;
    } else {
      console.log("❌ Knowledge base search failed");
      return false;
    }
  } catch (error) {
    console.log("❌ Error:", error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetQuickHelp() {
  console.log("\n📝 Testing: Get Quick Help");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const response = await axios.get(
      `${API_BASE_URL}/support/knowledge/quick-help`,
    );

    if (response.data.success) {
      console.log("✅ Quick help retrieved successfully");
      console.log("💡 Suggestions:", response.data.data.length);
      response.data.data.slice(0, 3).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.question}`);
      });
      return true;
    } else {
      console.log("❌ Failed to get quick help");
      return false;
    }
  } catch (error) {
    console.log("❌ Error:", error.response?.data?.message || error.message);
    return false;
  }
}

async function testEscalation() {
  if (!conversationId) {
    console.log("\n⚠️  Skipping: Escalation (no conversation ID)");
    return false;
  }

  console.log("\n📝 Testing: Escalate to Human");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const response = await axios.post(`${API_BASE_URL}/support/chat/escalate`, {
      conversationId,
      reason: "Testing escalation feature",
    });

    if (response.data.success) {
      console.log("✅ Escalation successful");
      console.log("📧 Message:", response.data.data.message);
      return true;
    } else {
      console.log("❌ Escalation failed");
      return false;
    }
  } catch (error) {
    console.log("❌ Error:", error.response?.data?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║   AI SUPPORT SYSTEM - TEST SUITE         ║");
  console.log("╚═══════════════════════════════════════════╝");
  console.log(`\n🌐 API Base URL: ${API_BASE_URL}`);
  console.log("⏰ Starting tests...\n");

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  // Wait a bit between tests to avoid rate limiting
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // Run tests
  if (tests.startConversation) {
    const result = await testStartConversation();
    result ? results.passed++ : results.failed++;
    await delay(2000);
  }

  if (tests.continueConversation) {
    const result = await testContinueConversation();
    result ? results.passed++ : results.failed++;
    await delay(2000);
  }

  if (tests.searchKnowledge) {
    const result = await testSearchKnowledge();
    result ? results.passed++ : results.failed++;
    await delay(1000);
  }

  if (tests.getQuickHelp) {
    const result = await testGetQuickHelp();
    result ? results.passed++ : results.failed++;
    await delay(1000);
  }

  if (tests.escalate && conversationId) {
    const result = await testEscalation();
    result ? results.passed++ : results.failed++;
  }

  // Summary
  console.log("\n╔═══════════════════════════════════════════╗");
  console.log("║          TEST RESULTS SUMMARY             ║");
  console.log("╚═══════════════════════════════════════════╝\n");
  console.log(`✅ Passed:  ${results.passed}`);
  console.log(`❌ Failed:  ${results.failed}`);
  console.log(`⏭️  Skipped: ${results.skipped}`);
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  if (results.failed === 0) {
    console.log("🎉 All tests passed! AI Support System is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Please check the errors above.");
  }

  console.log("\n💡 Tips:");
  console.log("   - Make sure your server is running (npm run dev)");
  console.log("   - Check OPENAI_API_KEY is set in .env");
  console.log("   - Run: node prisma/seed-knowledge-base.js");
  console.log("   - Check: AI_SUPPORT_SYSTEM_COMPLETE.md for setup\n");
}

// Check if server is running
async function checkServer() {
  try {
    await axios.get(`${API_BASE_URL.replace("/api/v1", "")}/health`);
    return true;
  } catch (error) {
    console.log("\n❌ Server is not running!");
    console.log("   Please start your server with: npm run dev\n");
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();

  if (serverRunning) {
    await runTests();
  }

  process.exit(0);
})();
