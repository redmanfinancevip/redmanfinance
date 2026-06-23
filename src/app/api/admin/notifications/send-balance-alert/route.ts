import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/supabaseService';

export async function POST(req: Request) {
  try {
    const authResult = await verifyAdmin(req);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { profile: adminProfile, serviceClient } = authResult;
    const body = await req.json();
    const { userId, type, amount, notes, backdateDate, transactionId } = body;

    // Fetch user and profile
    const { data: user, error: userError } = await serviceClient
      .from('users')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build email content
    const actionType = type === 'deposit' ? 'Deposit' : 'Withdrawal';
    const amountFormatted = `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const userName = user.name || 'Valued Member';
    
    let transactionDate = new Date().toLocaleString();
    let backdatingNotice = '';
    
    if (backdateDate) {
      transactionDate = new Date(backdateDate).toLocaleString();
      backdatingNotice = `<p style="color: #ff6b35; font-weight: 500;">⚠️ Note: This transaction has been backdated to ${transactionDate} for record-keeping purposes.</p>`;
    }

    const emailSubject = `Balance ${actionType} Notification - ${amountFormatted}`;
    
    const emailHtml = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; color: #1a1a1a; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
      .header { background: linear-gradient(135deg, #E8500A, #FF6B35); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
      .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
      .detail-box { background: #f5f5f5; padding: 15px; border-left: 4px solid #E8500A; margin: 15px 0; }
      .success-text { color: #22c55e; font-weight: 600; }
      .warning-text { color: #ff6b35; font-weight: 500; }
      .footer { color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; }
      table { width: 100%; }
      td { padding: 8px 0; }
      .label { font-weight: 500; color: #666; width: 40%; }
      .value { font-weight: 600; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>${actionType} Confirmation</h1>
        <p>Your account has been ${type === 'deposit' ? 'credited' : 'debited'}</p>
      </div>
      
      <div class="content">
        <p>Hello ${userName},</p>
        
        <p>Your Redman Finance account has been successfully ${type === 'deposit' ? 'credited with' : 'debited by'} funds.</p>
        
        <div class="detail-box">
          <table>
            <tr>
              <td class="label">Transaction Type:</td>
              <td class="value">${actionType}</td>
            </tr>
            <tr>
              <td class="label">Amount:</td>
              <td class="value success-text">${type === 'deposit' ? '+' : '-'}${amountFormatted}</td>
            </tr>
            <tr>
              <td class="label">Transaction Date:</td>
              <td class="value">${transactionDate}</td>
            </tr>
            <tr>
              <td class="label">Transaction ID:</td>
              <td class="value">${transactionId || 'Pending'}</td>
            </tr>
            ${notes ? `<tr><td class="label">Notes:</td><td class="value">${notes}</td></tr>` : ''}
          </table>
        </div>
        
        ${backdatingNotice}
        
        <p>If you did not authorize this transaction or have any questions, please contact our support team immediately.</p>
        
        <p style="margin-top: 30px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://redmanfinance.com'}/dashboard" 
             style="background: #E8500A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Your Account
          </a>
        </p>
        
        <div class="footer">
          <p>This is an automated message from Redman Finance. Please do not reply to this email.</p>
          <p>© ${new Date().getFullYear()} Redman Finance. All rights reserved.</p>
        </div>
      </div>
    </div>
  </body>
</html>
    `;

    // Send email via API (assumes you have an email service configured)
    // For now, we'll log it and create a notification record
    await serviceClient.from('notifications').insert({
      user_id: userId,
      type: 'balance_adjustment',
      subject: emailSubject,
      message: `${actionType} of ${amountFormatted} ${type === 'deposit' ? 'to' : 'from'} your account${notes ? ': ' + notes : ''}`,
      metadata: {
        transaction_type: type,
        amount: amount,
        transaction_id: transactionId,
        backdated: !!backdateDate,
        notes: notes
      },
      sent: true,
      created_at: new Date().toISOString()
    }).then(({ error }) => {
      if (error) console.error('Notification insert error:', error);
    });

    // In production, integrate with email service like SendGrid, Resend, etc.
    // Example with fetch to external email service:
    // await fetch('https://api.sendgrid.com/v3/mail/send', {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     personalizations: [{ to: [{ email: user.email, name: userName }] }],
    //     from: { email: 'noreply@redmanfinance.com', name: 'Redman Finance' },
    //     subject: emailSubject,
    //     content: [{ type: 'text/html', value: emailHtml }]
    //   })
    // });

    return NextResponse.json({
      success: true,
      message: `Notification prepared for ${user.email}`,
      email: {
        to: user.email,
        subject: emailSubject,
        template: 'balance_adjustment'
      }
    });
  } catch (error: any) {
    console.error('[POST /api/admin/notifications/send-balance-alert] Runtime error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
