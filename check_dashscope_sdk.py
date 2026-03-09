import dashscope
from dashscope import Generation

# 查看dashscope模块的属性和方法
print("DashScope 模块属性:")
print(dir(dashscope))

# 查看Generation类的属性和方法
print("\nGeneration 类属性:")
print(dir(Generation))

# 查看Generation.call方法的签名
import inspect
print("\nGeneration.call 方法签名:")
print(inspect.signature(Generation.call))

# 查看Generation.call方法的文档
print("\nGeneration.call 方法文档:")
print(inspect.getdoc(Generation.call))
