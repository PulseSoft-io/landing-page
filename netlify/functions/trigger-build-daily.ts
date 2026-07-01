import type { Config } from '@netlify/functions';

export default async (request: Request) => {
  // Retrieve the build hook URL safely stored in environment variables
  const buildHookUrl = Netlify.env.get('DAILY_BUILD_HOOK_URL');

  if (!buildHookUrl) {
    console.error('Missing DAILY_BUILD_HOOK_URL environment variable.');
    return new Response('Configuration Error', { status: 500 });
  }

  try {
    // Send an empty POST request to trigtger the Netlify build
    const response = await fetch(buildHookUrl, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Netlify API responded with status: ${response.status}`);
    }

    console.log('Daily rebuild successfully triggered!');
    return new Response('Build Triggered Successfully');
  } catch (error) {
    console.error('Failed to trigger daily rebuild:', error);
    return new Response('Execution Failed', { status: 500 });
  }
};

// Netlify configuration specifying the cron schedule
export const config: Config = {
  schedule: '@daily', // Runs every day at midnight UTC
};
