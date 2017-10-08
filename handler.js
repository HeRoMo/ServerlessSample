'use strict';

import Github from 'github-api';
import slack from 'slack-incoming-webhook'
import AWS from 'aws-sdk';
const codebuild = new AWS.CodeBuild();

export const dispatch = async (event, context, callback) => {
  if(event.Records && event.Records.length > 0 ){
    const githubEventType = event.Records[0].Sns.MessageAttributes["X-Github-Event"].Value
    const message = JSON.parse(event.Records[0].Sns.Message)
    const pullRequest = message.pull_request
    const pullRequestAction = message.action
    console.log("githubEventType: %s, pullRequestAction: %s", githubEventType, pullRequestAction)
    console.log(JSON.stringify(message))
    await updatePRStatus(pullRequest)
    const codebuildParams = {
      projectName: process.env.CODEBUILD_PROJECT,
      buildspecOverride: process.env.CODEBUILD_BUILDSPEC,
      sourceVersion: pullRequest.head.sha
    }
    codebuild.startBuild(codebuildParams, (err, data)=>{
      if(err){
        console.log(err, err.stack)
      } else {
        console.log(JSON.stringify(data))
      }
    })
    await sendMessageToSlack("UNIT TEST START ")
  }
  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Your function executed successfully!',
      input: event,
    }),
  };

  callback(null, response);
};

async function updatePRStatus(pullRequest){
  const gh = new Github({
    token: process.env.GITHUB_TOKEN
  });
  const repo = gh.getRepo(process.env.GITHUB_REPO_OWNER, process.env.GITHUB_REPO_NAME)
  const opts = {
    state: 'pending',
    description: 'ユニットテスト実行中',
    context: 'TESTING'
  }
  const commitSHA = pullRequest.head.sha
  const result = await repo.updateStatus(commitSHA, opts)
  console.log(JSON.stringify(result.data))
}

async function sendMessageToSlack(message){
  const opts = {
    url: process.env.SLACK_WEBHOOK_URL
  }
  slack(message, opts)
}
