import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get the user from the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log('Analyzing risks for user:', user.id);

    // Fetch all journal entries and lines for the user
    const { data: entries, error: entriesError } = await supabase
      .from('journal_entries')
      .select(`
        *,
        journal_entry_lines(*)
      `)
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (entriesError) {
      console.error('Error fetching entries:', entriesError);
      throw entriesError;
    }

    console.log(`Found ${entries?.length || 0} entries to analyze`);

    // Rule-based checks
    const findings: any[] = [];
    const now = new Date();

    // Check for duplicate entries
    const entryMap = new Map();
    entries?.forEach((entry: any) => {
      const key = `${entry.entry_date}-${entry.description}`;
      if (entryMap.has(key)) {
        findings.push({
          finding_type: 'duplicate_entry',
          severity: 'medium',
          title: 'Potential Duplicate Entry Detected',
          description: `Entry on ${entry.entry_date} with description "${entry.description}" appears to be duplicated.`,
          recommendations: 'Review these entries and remove duplicates if necessary.',
          related_entry_id: entry.id,
          status: 'open'
        });
      }
      entryMap.set(key, entry);
    });

    // Check for large transactions
    entries?.forEach((entry: any) => {
      entry.journal_entry_lines?.forEach((line: any) => {
        const amount = parseFloat(line.amount);
        if (amount > 10000) {
          findings.push({
            finding_type: 'large_transaction',
            severity: 'high',
            title: 'Large Transaction Detected',
            description: `Transaction of $${amount.toLocaleString()} in account "${line.account_name}"`,
            recommendations: 'Verify that this large transaction is legitimate and properly documented.',
            related_entry_id: entry.id,
            status: 'open'
          });
        }
      });
    });

    // Check for missing reference numbers
    entries?.forEach((entry: any) => {
      if (!entry.reference_number) {
        findings.push({
          finding_type: 'missing_documentation',
          severity: 'low',
          title: 'Missing Reference Number',
          description: `Entry on ${entry.entry_date} is missing a reference number.`,
          recommendations: 'Add a reference number for better tracking and audit trail.',
          related_entry_id: entry.id,
          status: 'open'
        });
      }
    });

    // Calculate comprehensive financial metrics
    let totalRevenue = 0;
    let totalExpenses = 0;
    let cashBalance = 0;
    let bankBalance = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let costOfGoodsSold = 0;
    let operatingExpenses = 0;
    let inventory = 0;
    let accountsReceivable = 0;
    let accountsPayable = 0;

    // Track monthly data for variance and trend analysis
    const monthlyData = new Map();

    entries?.forEach((entry: any) => {
      const entryDate = new Date(entry.entry_date);
      const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { revenue: 0, expenses: 0, profit: 0 });
      }

      entry.journal_entry_lines?.forEach((line: any) => {
        const amount = parseFloat(line.amount);
        
        // Revenue tracking
        if (line.account_type === 'sales' && line.entry_type === 'credit') {
          totalRevenue += amount;
          monthlyData.get(monthKey).revenue += amount;
        }
        
        // Expense tracking
        if (['purchase', 'payroll', 'accounts_payable'].includes(line.account_type) && line.entry_type === 'debit') {
          totalExpenses += amount;
          monthlyData.get(monthKey).expenses += amount;
        }
        
        // Cost of Goods Sold
        if (line.account_type === 'purchase' && line.entry_type === 'debit') {
          costOfGoodsSold += amount;
        }
        
        // Operating Expenses
        if (['payroll', 'office_expense'].includes(line.account_type) && line.entry_type === 'debit') {
          operatingExpenses += amount;
        }
        
        // Balance Sheet items
        if (line.account_type === 'cash') {
          cashBalance += line.entry_type === 'debit' ? amount : -amount;
        }
        if (line.account_type === 'bank') {
          bankBalance += line.entry_type === 'debit' ? amount : -amount;
          totalAssets += line.entry_type === 'debit' ? amount : -amount;
        }
        if (line.account_type === 'inventory' && line.entry_type === 'debit') {
          inventory += amount;
          totalAssets += amount;
        }
        if (line.account_type === 'accounts_receivable' && line.entry_type === 'debit') {
          accountsReceivable += amount;
          totalAssets += amount;
        }
        if (line.account_type === 'accounts_payable' && line.entry_type === 'credit') {
          accountsPayable += amount;
          totalLiabilities += amount;
        }
      });
    });

    // Calculate profitability metrics
    const netProfit = totalRevenue - totalExpenses;
    const grossProfit = totalRevenue - costOfGoodsSold;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const grossProfitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const operatingProfitMargin = totalRevenue > 0 ? ((grossProfit - operatingExpenses) / totalRevenue) * 100 : 0;

    // Calculate financial ratios
    const currentRatio = totalLiabilities > 0 ? totalAssets / totalLiabilities : 0;
    const quickRatio = totalLiabilities > 0 ? (totalAssets - inventory) / totalLiabilities : 0;
    const debtToEquity = (totalAssets - totalLiabilities) > 0 ? totalLiabilities / (totalAssets - totalLiabilities) : 0;
    const workingCapital = totalAssets - totalLiabilities;

    // Calculate ROI and ROE
    const equity = totalAssets - totalLiabilities;
    const roi = totalAssets > 0 ? (netProfit / totalAssets) * 100 : 0;
    const roe = equity > 0 ? (netProfit / equity) * 100 : 0;

    // Variance analysis (compare current month to previous)
    const months = Array.from(monthlyData.keys()).sort();
    let revenueVariance = 0;
    let expenseVariance = 0;
    if (months.length >= 2) {
      const currentMonth = monthlyData.get(months[months.length - 1]);
      const previousMonth = monthlyData.get(months[months.length - 2]);
      revenueVariance = currentMonth.revenue - previousMonth.revenue;
      expenseVariance = currentMonth.expenses - previousMonth.expenses;
    }

    // Cash flow analysis
    const operatingCashFlow = netProfit + (accountsPayable - accountsReceivable);
    const cashFlowToDebtRatio = totalLiabilities > 0 ? operatingCashFlow / totalLiabilities : 0;

    // Prepare comprehensive data summary for AI
    const dataSummary = {
      total_entries: entries?.length || 0,
      
      // Income Statement Metrics
      total_revenue: totalRevenue,
      cost_of_goods_sold: costOfGoodsSold,
      gross_profit: grossProfit,
      operating_expenses: operatingExpenses,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      
      // Profitability Ratios
      profit_margin: profitMargin,
      gross_profit_margin: grossProfitMargin,
      operating_profit_margin: operatingProfitMargin,
      
      // Balance Sheet
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      equity: equity,
      cash_balance: cashBalance,
      bank_balance: bankBalance,
      inventory: inventory,
      accounts_receivable: accountsReceivable,
      accounts_payable: accountsPayable,
      working_capital: workingCapital,
      
      // Financial Ratios
      current_ratio: currentRatio,
      quick_ratio: quickRatio,
      debt_to_equity: debtToEquity,
      roi: roi,
      roe: roe,
      
      // Cash Flow
      operating_cash_flow: operatingCashFlow,
      cash_flow_to_debt_ratio: cashFlowToDebtRatio,
      
      // Variance Analysis
      revenue_variance: revenueVariance,
      expense_variance: expenseVariance,
      
      rule_based_findings: findings.length
    };

    console.log('Financial summary:', dataSummary);

    // Call Lovable AI for comprehensive financial analysis
    const aiPrompt = `You are an expert financial analyst specializing in cost accounting, management accounting, financial accounting, and performance analysis. Analyze the comprehensive financial data below and identify risks, threats, fraud indicators, and provide actionable insights.

COMPREHENSIVE FINANCIAL DATA:

Income Statement:
- Total Revenue: $${dataSummary.total_revenue.toLocaleString()}
- Cost of Goods Sold: $${dataSummary.cost_of_goods_sold.toLocaleString()}
- Gross Profit: $${dataSummary.gross_profit.toLocaleString()}
- Operating Expenses: $${dataSummary.operating_expenses.toLocaleString()}
- Net Profit: $${dataSummary.net_profit.toLocaleString()}

Profitability Metrics:
- Gross Profit Margin: ${dataSummary.gross_profit_margin.toFixed(2)}%
- Operating Profit Margin: ${dataSummary.operating_profit_margin.toFixed(2)}%
- Net Profit Margin: ${dataSummary.profit_margin.toFixed(2)}%
- ROI: ${dataSummary.roi.toFixed(2)}%
- ROE: ${dataSummary.roe.toFixed(2)}%

Balance Sheet:
- Total Assets: $${dataSummary.total_assets.toLocaleString()}
- Total Liabilities: $${dataSummary.total_liabilities.toLocaleString()}
- Equity: $${dataSummary.equity.toLocaleString()}
- Working Capital: $${dataSummary.working_capital.toLocaleString()}
- Cash: $${dataSummary.cash_balance.toLocaleString()}
- Bank: $${dataSummary.bank_balance.toLocaleString()}
- Inventory: $${dataSummary.inventory.toLocaleString()}
- Accounts Receivable: $${dataSummary.accounts_receivable.toLocaleString()}
- Accounts Payable: $${dataSummary.accounts_payable.toLocaleString()}

Financial Ratios:
- Current Ratio: ${dataSummary.current_ratio.toFixed(2)}
- Quick Ratio: ${dataSummary.quick_ratio.toFixed(2)}
- Debt-to-Equity: ${dataSummary.debt_to_equity.toFixed(2)}
- Cash Flow to Debt: ${dataSummary.cash_flow_to_debt_ratio.toFixed(2)}

Variance Analysis:
- Revenue Variance (vs prior period): $${dataSummary.revenue_variance.toLocaleString()}
- Expense Variance (vs prior period): $${dataSummary.expense_variance.toLocaleString()}

Cash Flow:
- Operating Cash Flow: $${dataSummary.operating_cash_flow.toLocaleString()}

ANALYSIS REQUIREMENTS:
Identify 5-8 critical insights covering:
1. **Cost Management**: Analyze COGS, operating expenses, cost efficiency, cost-volume-profit relationships
2. **Profitability Analysis**: Evaluate margins, pricing strategies, profit optimization opportunities
3. **Liquidity & Solvency**: Assess cash position, working capital, debt coverage, bankruptcy risk
4. **Performance Metrics**: Evaluate ROI, ROE, asset utilization, operational efficiency
5. **Variance Analysis**: Identify significant variances, budget deviations, trend anomalies
6. **Fraud Indicators**: Detect unusual patterns, red flags, potential manipulation
7. **Financial Health**: Overall business sustainability, growth potential, risk exposure
8. **Price & Cost Strategies**: Pricing optimization, cost reduction opportunities

Return ONLY a valid JSON array (no markdown, no code blocks):
[
  {
    "finding_type": "cost_management|profitability_analysis|liquidity_risk|fraud_indicator|variance_concern|performance_issue|sustainability_risk|pricing_strategy",
    "severity": "low|medium|high|critical",
    "title": "Brief specific title",
    "description": "Detailed analysis with specific numbers and percentages",
    "recommendations": "Concrete actionable steps with expected impact"
  }
]`;

    console.log('Calling AI for analysis...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI analysis failed');
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '[]';
    
    console.log('AI response:', aiContent);

    // Parse AI findings
    let aiFindings = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      aiFindings = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Error parsing AI response:', e);
      console.error('AI content was:', aiContent);
    }

    // Combine all findings
    const allFindings = [...findings, ...aiFindings];

    // Insert findings into database
    console.log(`Inserting ${allFindings.length} findings into database...`);
    
    if (allFindings.length > 0) {
      const { error: insertError } = await supabase
        .from('risk_findings')
        .insert(
          allFindings.map((finding: any) => ({
            ...finding,
            user_id: user.id
          }))
        );

      if (insertError) {
        console.error('Error inserting findings:', insertError);
        throw insertError;
      }
    }

    console.log('Analysis complete');

    return new Response(
      JSON.stringify({ 
        success: true, 
        findings_count: allFindings.length,
        summary: dataSummary 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-risks function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
