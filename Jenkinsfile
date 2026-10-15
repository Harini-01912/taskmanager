
pipeline {
    agent any

    environment {
        PYTHON = 'C:\\Users\\Harin\\AppData\\Local\\Programs\\Python\\Python312\\python.exe'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Check Python') {
            steps {
                bat '"%PYTHON%" --version'
            }
        }

        stage('Install Dependencies') {
            steps {
                bat '"%PYTHON%" -m pip install -r requirements.txt'
            }
        }

        stage('Run Tests') {
            steps {
                bat '"%PYTHON%" -m pytest -v'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t task-manager:1.0 .'
            }
        }
    }

    post {
        success {
            echo 'SUCCESS: Tests passed and Docker image built.'
        }
        failure {
            echo 'FAILED: Check the Jenkins console output.'
        }
    }
}
