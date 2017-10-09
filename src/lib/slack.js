import slack from 'slack-incoming-webhook'

export default {
  sendMessage: async function(message){
    const opts = {
      url: process.env.SLACK_WEBHOOK_URL
    }
    slack(message, opts)
  }
}
