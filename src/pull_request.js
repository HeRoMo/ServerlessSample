'use strict';

import slack from 'slack-incoming-webhook'
import AWS from 'aws-sdk';
import Github from './lib/github.js'
const codebuild = new AWS.CodeBuild();
const lambda = new AWS.Lambda();

function parseEvent(event){
  const githubEventType = event.Records[0].Sns.MessageAttributes["X-Github-Event"].Value
  const message = JSON.parse(event.Records[0].Sns.Message)
  const pullRequest = message.pull_request
  const pullRequestAction = message.action
  console.log("message: %s", JSON.stringify(message))
  return {
    githubEventType,
    pullRequestAction,
    pullRequest
  }
}

export const dispatch = async (event, context, callback) => {
  if (!event.Records || event.Records.length <= 0){
    context.callbackWaitsForEmptyEventLoop = false
    callback(null, { message: "dispatch function is called by EMPTY event" });
    return
  }

  const {githubEventType, pullRequestAction, pullRequest} = parseEvent(event)
  console.log("githubEventType: %s, pullRequestAction: %s", githubEventType, pullRequestAction)

  switch(pullRequestAction){
    case 'opened':
    case 'synchronize':
      const opts = {
        state: 'pending',
        description: 'ユニットテスト実行中',
        context: 'TESTING'
      }
      const commitSHA = pullRequest.head.sha
      await Github.updatePRStatus(commitSHA, opts);
      await startUnitTest(pullRequest);
      await sendMessageToSlack("UNIT TEST START")
      break;
    case 'closed':
      // ステージングの破棄
      break;
    default:
      // NO-OP
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

function startUnitTest(pullRequest){
  const codebuildParams = {
    projectName: process.env.CODEBUILD_PROJECT,
    buildspecOverride: process.env.CODEBUILD_BUILDSPEC,
    sourceVersion: pullRequest.head.sha
  }
  return new Promise(function(resolve, reject){
    codebuild.startBuild(codebuildParams, (err, data)=>{
      if(err){
        console.log(err, err.stack)
        reject(err);
      } else {
        console.log(JSON.stringify(data))
        resolve(data)
      }
    });
  })
}

async function sendMessageToSlack(message){
  const opts = {
    url: process.env.SLACK_WEBHOOK_URL
  }
  slack(message, opts)
}

function invokeLambda(payload){
  const params = {
    FunctionName: "my-service-dev-pull_request",
    InvocationType: "Event",
    Payload: JSON.stringify(payload)
  };
  return new Promise(function(resolve, reject){
    lambda.invoke(params, function(err, data) {
      if(err) { reject(err);
      } else { resolve(data); }
    })
  })
}
