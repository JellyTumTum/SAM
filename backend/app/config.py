import os

class Settings:
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        if self.environment == "production":
            self.api_base_url = "https://cst.dev/sam/"
        else:
            self.api_base_url = "http://localhost:8000"

settings = Settings()
