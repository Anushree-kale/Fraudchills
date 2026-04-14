$KAGGLE = "C:\Users\kalea\AppData\Local\Programs\Python\Python312\Scripts\kaggle.exe"
$ErrorActionPreference = "Continue"

Write-Host "Extracting E-Commerce Dataset..."
if (Test-Path "fraudulent-e-commerce-transactions.zip") {
    Expand-Archive fraudulent-e-commerce-transactions.zip -DestinationPath . -Force
    Get-ChildItem -Filter "*E-Commerce*.csv" | Rename-Item -NewName ecommerce_fraud.csv -Force
}

Write-Host "Downloading Credit Card Dataset..."
& $KAGGLE datasets download -d mlg-ulb/creditcardfraud
if (Test-Path "creditcardfraud.zip") {
    Expand-Archive creditcardfraud.zip -DestinationPath . -Force
}

Write-Host "Downloading PaySim Dataset..."
& $KAGGLE datasets download -d ealaxi/paysim1
if (Test-Path "paysim1.zip") {
    Expand-Archive paysim1.zip -DestinationPath . -Force
    Get-ChildItem -Filter "PS_*.csv" | Rename-Item -NewName paysim.csv -Force
}

Write-Host "Downloading IEEE Fraud Dataset..."
& $KAGGLE competitions download -c ieee-fraud-detection
if (Test-Path "ieee-fraud-detection.zip") {
    Expand-Archive ieee-fraud-detection.zip -DestinationPath . -Force
    if (Test-Path "train_transaction.csv") { Rename-Item train_transaction.csv ieee_train_transaction.csv -Force }
    if (Test-Path "train_identity.csv") { Rename-Item train_identity.csv ieee_train_identity.csv -Force }
}

Write-Host "Cleaning up ZIP files..."
Remove-Item *.zip -Force

Write-Host "Finished preparing datasets."
