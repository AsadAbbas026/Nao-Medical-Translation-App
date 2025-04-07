from transformers import AutoModelForCausalLM, AutoTokenizer
import bleach

# Load model and tokenizer
tokenizer = AutoTokenizer.from_pretrained("microsoft/biogpt")
model = AutoModelForCausalLM.from_pretrained("microsoft/biogpt")

# Tokenize
def correct_medical_terms(text: str) -> str:
    inputs = tokenizer(text, return_tensors="pt")
    outputs = model.generate(**inputs, max_new_tokens=50)
    return tokenizer.decode(outputs[0], skip_special_tokens=True)

def sanitize_input(user_text):
    return bleach.clean(user_text)