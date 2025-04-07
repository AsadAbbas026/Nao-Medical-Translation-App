from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate
from langchain_core.output_parsers import StrOutputParser
import os
from dotenv import load_dotenv

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

chat_model = ChatGoogleGenerativeAI(model="gemini-1.5-flash", api_key=GOOGLE_API_KEY)

prompt = ChatPromptTemplate.from_messages([
    SystemMessagePromptTemplate.from_template(
        "You are a translation engine that returns only the translated text without any extra explanation."
    ),
    HumanMessagePromptTemplate.from_template(
        "Translate this to {target_lang}: {text_to_translate}"
    )
])

output_parser = StrOutputParser()

chain = prompt | chat_model | output_parser

def translate_text(text_to_translate, target_lang):
    return chain.invoke({"text_to_translate": text_to_translate, "target_lang": target_lang})

#if __name__ == "__main__":
#    print(translate_text("covid-19 ke simptoms kya hai", "de"))
