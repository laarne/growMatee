const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gndnmbdzfoamtgjkvnyr.supabase.co';
const supabaseAnonKey = 'sb_publishable_zojIDwrTmNXHQLWuOhm7yQ_2pIvgypM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const jmUserId = '1eef99f7-13ce-40b3-8481-d7f052bf52b0'; // John Michael Beringuel

async function main() {
  console.log('Testing insert of rank event...');
  const { data, error } = await supabase
    .from('rank_events')
    .insert({
      user_id: jmUserId,
      source: 'system_sync',
      points: 45,
    })
    .select();

  if (error) {
    console.error('Insert failed:', error);
  } else {
    console.log('Insert succeeded! Inserted data:', data);
  }
}

main().catch(console.error);
