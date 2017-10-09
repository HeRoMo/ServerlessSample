import Github from 'github-api';

export default {
  updatePRStatus: async function(commitSHA, opts){
    const gh = new Github({
      token: process.env.GITHUB_TOKEN
    });
    const repo = gh.getRepo(process.env.GITHUB_REPO_OWNER, process.env.GITHUB_REPO_NAME)
    const result = await repo.updateStatus(commitSHA, opts)
    console.log(JSON.stringify(result.data))
    return result.data
  }
}
