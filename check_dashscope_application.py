import dashscope
from dashscope import Application

# 查看Application类的属性和方法
print("Application 类属性:")
print(dir(Application))

# 查看Application.call方法的签名
import inspect
print("\nApplication.call 方法签名:")
print(inspect.signature(Application.call))

# 查看Application.call方法的文档
print("\nApplication.call 方法文档:")
print(inspect.getdoc(Application.call))

# 查看dashscope.app模块
print("\nDashScope app模块:")
print(dir(dashscope.app))
