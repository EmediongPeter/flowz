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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { messages } = await req.json();

    // Fetch user's financial data for context
    const { data: entries } = await supabase
      .from('journal_entries')
      .select(`*, journal_entry_lines(*)`)
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    // Calculate key metrics for context
    let totalRevenue = 0;
    let totalExpenses = 0;
    let cashBalance = 0;

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
      });
    });

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Prepare system message with financial context
    const systemMessage = {
      role: "system",
      content: `You are Adidy, an expert financial analyst and business advisor. You have access to the user's financial data.

CURRENT FINANCIAL SNAPSHOT:
- Total Revenue: $${totalRevenue.toLocaleString()}
- Total Expenses: $${totalExpenses.toLocaleString()}
- Net Profit: $${netProfit.toLocaleString()}
- Profit Margin: ${profitMargin.toFixed(2)}%
- Cash Balance: $${cashBalance.toLocaleString()}
- Total Journal Entries: ${entries?.length || 0}

CAPABILITIES:
- Analyze financial performance and trends
- Calculate NPV, IRR, and other financial metrics
- Provide cost management insights
- Identify profitability opportunities
- Assess financial health and risks
- Offer strategic recommendations
- Explain accounting concepts
- Help with financial planning and budgeting

PERSONALITY:
- Professional yet approachable
- Data-driven and analytical
- Proactive in identifying issues and opportunities
- Clear and concise in explanations
- Action-oriented with specific recommendations

Always provide specific, actionable insights based on the user's actual financial data when relevant.`
    };

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [systemMessage, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('AI chat failed');
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in chat-adidy function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
