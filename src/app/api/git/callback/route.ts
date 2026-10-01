import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { encryptToken } from '@/lib/git-crypto';

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    const cookieStore = await cookies();
    const savedState = cookieStore.get('git_oauth_state')?.value;
    const workspaceId = cookieStore.get('git_oauth_workspace_id')?.value;

    cookieStore.delete('git_oauth_state');
    cookieStore.delete('git_oauth_workspace_id');

    if (!code || !savedState || !state || state !== savedState) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/workspaces?error=invalid_oauth_state`
      );
    }

    if (!workspaceId) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/workspaces?error=missing_workspace`
      );
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('GitHub OAuth credentials not configured');
      return NextResponse.redirect(
        `${appUrl}/dashboard/workspaces?error=github_not_configured`
      );
    }

    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      }
    );

    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    if (tokenData.error || !tokenData.access_token) {
      console.error(
        'GitHub token exchange failed:',
        tokenData.error_description || tokenData.error
      );
      return NextResponse.redirect(
        `${appUrl}/dashboard/workspaces?error=github_token_exchange`
      );
    }

    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    const githubUser = (await userResponse.json()) as { login?: string };

    const encrypted = encryptToken(tokenData.access_token);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        `${appUrl}/dashboard/workspaces?error=not_authenticated`
      );
    }

    const provider = 'github';
    const repoFullName = `${githubUser.login}/pending`;

    const { error: insertError } = await supabase
      .from('git_connections')
      .insert({
        workspace_id: workspaceId,
        provider,
        repo_full_name: repoFullName,
        access_token_encrypted: encrypted,
        created_by: user.id,
      });

    if (insertError) {
      console.error('Failed to store git connection:', insertError);
      return NextResponse.redirect(
        `${appUrl}/dashboard/workspaces?error=db_insert_failed`
      );
    }

    return NextResponse.redirect(
      `${appUrl}/dashboard/workspaces/${workspaceId}/settings?git_connected=success`
    );
  } catch (error) {
    console.error('Git OAuth callback error:', error);
    return NextResponse.redirect(
      `${appUrl}/dashboard/workspaces?error=unexpected`
    );
  }
}
