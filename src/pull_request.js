'use strict';

import AWS from 'aws-sdk';
import Github from './lib/github.js'
import Slack from './lib/slack.js'
const codebuild = new AWS.CodeBuild();
const lambda = new AWS.Lambda();

function parseEvent(event){
  const githubEventType = event.Records[0].Sns.MessageAttributes["X-Github-Event"].Value
  const message = JSON.parse(event.Records[0].Sns.Message)
  const pullRequest = message.pull_request
  const pullRequestAction = message.action
  console.log("SNS.Message: %s", JSON.stringify(message))
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
  const pullRequestTitle = pullRequest.title
  const pullRequestUrl = pullRequest.html_url
  const pullRequestLabels = pullRequest.labels.map(l => l.name)
  console.log("Pull Request Labels: %s", JSON.stringify(pullRequestLabels))
  console.log("githubEventType: %s, pullRequestAction: %s", githubEventType, pullRequestAction)
  if (!pullRequestLabels.some(l => l === process.env.GITHUB_TEST_LABEL)) {
    console.log("このPRはテスト対象ではありません");
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        message: 'This PR is not test target !',
        input: event,
      }),
    };
    callback(null, response);
    return
  }

  switch(pullRequestAction){
    case 'opened':
    case 'labeled':
      console.log('added label: %s', JSON.stringify(pullRequest.label));
    case 'synchronize':
      const opts = {
        state: 'pending',
        description: 'ユニットテスト実行中',
        context: 'TESTING'
      }
      const commitSHA = pullRequest.head.sha
      await Github.updatePRStatus(commitSHA, opts);
      await startUnitTest(pullRequest);
      await Slack.sendMessage(`${pullRequestTitle} - ${opts.description}`)
      break;
    case 'closed':
      if(pullRequest.merged){
        await Slack.sendMessage(`${pullRequestTitle} - マージされました`)
      } else {
        await Slack.sendMessage(`${pullRequestTitle} - マージされずに終了されました`)
      }
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
    environmentVariablesOverride: [
      { name: 'PR_NUMBER', value: `${pullRequest.number}` },
      { name: 'PR_URL', value: pullRequest.html_url },
      { name: 'PR_TITLE', value: pullRequest.title }
    ],
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
