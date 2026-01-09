# Karate测试运行镜像
# 使用Eclipse Temurin (AdoptOpenJDK的继任者)
FROM eclipse-temurin:17-jre-jammy

# 设置工作目录
WORKDIR /karate

# 安装必要的工具
RUN apt-get update && \
    apt-get install -y curl maven && \
    rm -rf /var/lib/apt/lists/*

# 设置Karate版本
ARG KARATE_VERSION=1.4.1.RC4
ENV KARATE_VERSION=${KARATE_VERSION}

# 在不会被挂载覆盖的目录中创建Maven项目来下载依赖
RUN mkdir -p /opt/karate-deps && \
    echo '<?xml version="1.0" encoding="UTF-8"?>' > /opt/karate-deps/pom.xml && \
    echo '<project xmlns="http://maven.apache.org/POM/4.0.0"' >> /opt/karate-deps/pom.xml && \
    echo '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' >> /opt/karate-deps/pom.xml && \
    echo '         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">' >> /opt/karate-deps/pom.xml && \
    echo '  <modelVersion>4.0.0</modelVersion>' >> /opt/karate-deps/pom.xml && \
    echo '  <groupId>com.example</groupId>' >> /opt/karate-deps/pom.xml && \
    echo '  <artifactId>karate-test</artifactId>' >> /opt/karate-deps/pom.xml && \
    echo '  <version>1.0</version>' >> /opt/karate-deps/pom.xml && \
    echo '  <properties>' >> /opt/karate-deps/pom.xml && \
    echo '    <maven.compiler.source>17</maven.compiler.source>' >> /opt/karate-deps/pom.xml && \
    echo '    <maven.compiler.target>17</maven.compiler.target>' >> /opt/karate-deps/pom.xml && \
    echo '    <karate.version>${KARATE_VERSION}</karate.version>' >> /opt/karate-deps/pom.xml && \
    echo '  </properties>' >> /opt/karate-deps/pom.xml && \
    echo '  <dependencies>' >> /opt/karate-deps/pom.xml && \
    echo '    <dependency>' >> /opt/karate-deps/pom.xml && \
    echo '      <groupId>com.intuit.karate</groupId>' >> /opt/karate-deps/pom.xml && \
    echo '      <artifactId>karate-core</artifactId>' >> /opt/karate-deps/pom.xml && \
    echo '      <version>${karate.version}</version>' >> /opt/karate-deps/pom.xml && \
    echo '    </dependency>' >> /opt/karate-deps/pom.xml && \
    echo '  </dependencies>' >> /opt/karate-deps/pom.xml && \
    echo '</project>' >> /opt/karate-deps/pom.xml

# 下载Karate及其所有传递依赖（包括SLF4J等）
RUN cd /opt/karate-deps && \
    mvn dependency:copy-dependencies -q -DincludeScope=runtime && \
    echo "Dependencies downloaded successfully"

# 验证依赖是否下载成功
RUN test -d /opt/karate-deps/target/dependency && \
    echo "Dependencies directory exists" && \
    ls -la /opt/karate-deps/target/dependency/ | head -10 || \
    (echo "ERROR: Dependencies directory not found" && exit 1)

# 创建logback配置文件以启用详细日志输出
RUN mkdir -p /opt/karate-deps/src/test/resources && \
    echo '<?xml version="1.0" encoding="UTF-8"?>' > /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '<configuration>' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '    <encoder>' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '      <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} - %msg%n</pattern>' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '    </encoder>' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '  </appender>' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '  <logger name="com.intuit.karate" level="INFO"/>' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '  <root level="INFO">' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '    <appender-ref ref="STDOUT" />' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '  </root>' >> /opt/karate-deps/src/test/resources/logback-test.xml && \
    echo '</configuration>' >> /opt/karate-deps/src/test/resources/logback-test.xml

# 创建运行脚本，确保参数正确传递
# 如果通过环境变量传递了base64编码的文件内容，则在容器内解码并创建文件
RUN echo '#!/bin/bash' > /opt/karate-deps/run-karate.sh && \
    echo 'set -e' >> /opt/karate-deps/run-karate.sh && \
    echo 'cd /karate' >> /opt/karate-deps/run-karate.sh && \
    echo '# 如果通过环境变量传递了base64编码的文件内容，解码并创建文件' >> /opt/karate-deps/run-karate.sh && \
    echo 'if [ -n "$KARATE_FEATURE_CONTENT_B64" ] && [ -n "$KARATE_FEATURE_NAME" ]; then' >> /opt/karate-deps/run-karate.sh && \
    echo '  echo "$KARATE_FEATURE_CONTENT_B64" | base64 -d > "/karate/$KARATE_FEATURE_NAME"' >> /opt/karate-deps/run-karate.sh && \
    echo '  echo "Created feature file from base64 encoded environment variable: $KARATE_FEATURE_NAME"' >> /opt/karate-deps/run-karate.sh && \
    echo '# 兼容旧版本：如果使用未编码的内容' >> /opt/karate-deps/run-karate.sh && \
    echo 'elif [ -n "$KARATE_FEATURE_CONTENT" ] && [ -n "$KARATE_FEATURE_NAME" ]; then' >> /opt/karate-deps/run-karate.sh && \
    echo '  echo "$KARATE_FEATURE_CONTENT" > "/karate/$KARATE_FEATURE_NAME"' >> /opt/karate-deps/run-karate.sh && \
    echo '  echo "Created feature file from environment variable: $KARATE_FEATURE_NAME"' >> /opt/karate-deps/run-karate.sh && \
    echo 'fi' >> /opt/karate-deps/run-karate.sh && \
    echo 'echo "Working directory: $(pwd)"' >> /opt/karate-deps/run-karate.sh && \
    echo 'echo "Files in /karate:"' >> /opt/karate-deps/run-karate.sh && \
    echo 'ls -la /karate/ || true' >> /opt/karate-deps/run-karate.sh && \
    echo 'echo "Arguments received: $@"' >> /opt/karate-deps/run-karate.sh && \
    echo 'CLASSPATH="/opt/karate-deps/src/test/resources:$(find /opt/karate-deps/target/dependency -name '\''*.jar'\'' | tr '\''\\n'\'' '\'':'\'')"' >> /opt/karate-deps/run-karate.sh && \
    echo 'CLASSPATH=${CLASSPATH%:}' >> /opt/karate-deps/run-karate.sh && \
    echo 'java -cp "$CLASSPATH" com.intuit.karate.Main "$@"' >> /opt/karate-deps/run-karate.sh && \
    chmod +x /opt/karate-deps/run-karate.sh

# 设置入口点 - 使用脚本确保参数正确传递
ENTRYPOINT ["/opt/karate-deps/run-karate.sh"]
