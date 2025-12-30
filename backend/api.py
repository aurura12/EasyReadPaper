import os
import shutil
import tempfile
from typing import List
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.chat_models import ChatTongyi
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from fastapi.middleware.cors import CORSMiddleware
from langchain.text_splitter import RecursiveCharacterTextSplitter
import uvicorn

app = FastAPI()

# 1. 跨域配置：允许 Electron 前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 设置 API Key
os.environ["DASHSCOPE_API_KEY"] = "sk-1f5b2fe065cc4a6caa62f9f984ffe97a"

# 3. 定义数据结构
class WordItem(BaseModel):
    word: str = Field(description="英文单词")
    translation: str = Field(description="中文释义")

class WordList(BaseModel):
    words: List[WordItem]

parser = JsonOutputParser(pydantic_object=WordList)
llm = ChatTongyi(model_name="qwen-turbo")

# 核心：定义提取生词的链
prompt = PromptTemplate(
    template="你是一个英语专家。请从以下学术论文片段中提取出6级难度的词汇。\n{format_instructions}\n内容片段：{query}",
    input_variables=["query"],
    partial_variables={"format_instructions": parser.get_format_instructions()},
)
chain = prompt | llm | parser

@app.post("/analyze_pdf")
async def analyze_pdf(file: UploadFile = File(...)):
    # 使用系统临时目录，避免打包后在 Program Files 目录下因无写权限报错
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name

    try:
        # 1. 加载全文
        loader = PyPDFLoader(temp_path)
        docs = loader.load()

        # 2. 文本切分
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
        splits = text_splitter.split_documents(docs)

        # 3. 分批处理
        all_words = []
        seen_words = set()

        max_chunks = min(len(splits), 5)

        for i in range(max_chunks):
            print(f"正在分析第 {i+1}/{max_chunks} 段内容...")
            chunk_result = chain.invoke({"query": splits[i].page_content})

            if "words" in chunk_result:
                for item in chunk_result["words"]:
                    w_lower = item['word'].lower()
                    if w_lower not in seen_words:
                        all_words.append(item)
                        seen_words.add(w_lower)

        return {"status": "success", "result": all_words}

    except Exception as e:
        return {"status": "error", "detail": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    # 启动服务器
    print("WordMine 后端服务启动中...")
    uvicorn.run(app, host="127.0.0.1", port=8000)