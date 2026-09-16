package com.expensetracker.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;

public class SmsReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        String format = bundle.getString("format");

        if (pdus != null && pdus.length > 0) {
            StringBuilder fullBody = new StringBuilder();
            String address = "";
            long timestamp = System.currentTimeMillis();

            for (Object pdu : pdus) {
                SmsMessage sms;
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                    sms = SmsMessage.createFromPdu((byte[]) pdu, format);
                } else {
                    sms = SmsMessage.createFromPdu((byte[]) pdu);
                }

                if (sms != null) {
                    address = sms.getDisplayOriginatingAddress();
                    fullBody.append(sms.getMessageBody());
                    timestamp = sms.getTimestampMillis();
                }
            }

            if (fullBody.length() > 0) {
                MainActivity.dispatchIncomingSms(address, fullBody.toString(), timestamp);
            }
        }
    }
}
