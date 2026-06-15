FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -q
COPY src ./src
RUN mvn package -DskipTests -q

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

RUN apk add --no-cache ttf-dejavu

RUN addgroup -S studymate \
    && adduser -S studymate -G studymate \
    && mkdir -p /app/uploads \
    && chown -R studymate:studymate /app

USER studymate

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"
ENV AI_AGENT_URL="https://nguyenngotramy2427-studymate-ai-agent.hf.space"
ENV AI_AGENT_TIMEOUT_SECONDS=45
ENV APP_LOG_LEVEL=INFO

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
