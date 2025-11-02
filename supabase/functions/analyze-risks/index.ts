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

    // Calculate financial metrics for AI analysis
    let totalRevenue = 0;
    let totalExpenses = 0;
    let cashBalance = 0;
    let bankBalance = 0;

    entries?.forEach((entry: any) => {
      entry.journal_entry_lines?.forEach((line: any) => {
        const amount = parseFloat(line.amount);
        
        if (line.account_type === 'sales' && line.entry_type === 'credit') {
          totalRevenue += amount;
        }
        if (['purchase', 'payroll', 'accounts_payable'].includes(line.account_type) && line.entry_type === 'debit') {
          totalExpenses += amount;
        }
        if (line.account_type === 'cash') {
          cashBalance += line.entry_type === 'debit' ? amount : -amount;
        }
        if (line.account_type === 'bank') {
          bankBalance += line.entry_type === 'debit' ? amount : -amount;
        }
      });
    });

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Prepare data summary for AI
    const dataSummary = {
      total_entries: entries?.length || 0,
      total_revenue: totalRevenue,
      total_expenses: totalExpenses,
      net_profit: netProfit,
      profit_margin: profitMargin,
      cash_balance: cashBalance,
      bank_balance: bankBalance,
      rule_based_findings: findings.length
    };

    console.log('Financial summary:', dataSummary);

    // Call Lovable AI for intelligent analysis
    const aiPrompt = `You are a financial risk analyst. Analyze the following bookkeeping data and identify potential risks, threats, and anomalies.

Financial Summary:
- Total Entries: ${dataSummary.total_entries}
- Total Revenue: $${dataSummary.total_revenue.toLocaleString()}
- Total Expenses: $${dataSummary.total_expenses.toLocaleString()}
- Net Profit: $${dataSummary.net_profit.toLocaleString()}
- Profit Margin: ${dataSummary.profit_margin.toFixed(2)}%
- Cash Balance: $${dataSummary.cash_balance.toLocaleString()}
- Bank Balance: $${dataSummary.bank_balance.toLocaleString()}
- Rule-based findings already detected: ${dataSummary.rule_based_findings}

Analyze this data and identify 3-5 additional financial risks or patterns that aren't obvious from simple rules. Consider:
1. Cash flow issues or liquidity concerns
2. Unusual patterns or trends
3. Budget concerns or financial sustainability
4. Fraud indicators or anomalies
5. Business health indicators

Return ONLY a valid JSON array of findings (no markdown, no code blocks), each with this exact structure:
[
  {
    "finding_type": "cash_flow_risk|fraud_indicator|budget_concern|pattern_anomaly|sustainability_risk",
    "severity": "low|medium|high|critical",
    "title": "Brief title",
    "description": "Detailed description of the issue",
    "recommendations": "Actionable recommendations"
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
