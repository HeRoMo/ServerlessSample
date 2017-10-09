import Github from './lib/github.js'

export const dispatch = async (event, context, callback) => {
  console.log("EVENT: %s", JSON.stringify(event));

  const buildStatus = event.detail['build-status']
  const currentPhase = event.detail['current-phase']
  const info = event.detail['additional-information']
  const commitSHA = info['source-version']
  const githubOpts = { context: 'TESTING' }

  switch(buildStatus){
    case 'IN_PROGRESS':
      // NO-OP
      break;
    case 'SUCCEEDED':
      githubOpts.state: 'success'
      githubOpts.description: 'ユニットテストOK'
      break;
    case 'FAILED':
      githubOpts.state: 'failure'
      githubOpts.description: 'ユニットテストNG'
      // currentPhase:'BUILD' 以外ではNGでなくエラーとしたほうが良いかもしれない
      break;
    case 'STOPPED':
      githubOpts.state: 'pending'
      githubOpts.description: 'ユニットテストが停止されました'
      break;
  }
  await Github.updatePRStatus(commitSHA, githubOpts);

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'codebuild.js was executed successfully!',
      input: event,
    }),
  };
  callback(null, response);
}
