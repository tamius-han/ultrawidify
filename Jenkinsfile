// required jenkins plugins:
//     * https://plugins.jenkins.io/git/

pipeline {
  agent any

  stages {

    // stage('Check for changes') {
    //   sh "env.GIT_COMMIT != env.GIT_PREVIOUS_COMMIT"
    // }

    stage('Install dependencies') {
      steps {
        sh 'npm ci'
      }
    }

    stage('Build') {
      steps {
        sh 'npm run build-all'
      }
    }

    stage('Push to release server') {
      steps {
        sh "echo 'implement me pls!'"
      }
    }
  }

}
