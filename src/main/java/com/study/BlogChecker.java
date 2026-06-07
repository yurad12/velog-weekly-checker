package com.study;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class BlogChecker {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
    private static final String VELOG_URL = "https://v2.velog.io/graphql";
    private static final int REQUIRED_COUNT = 3;

    private static final List<String> USER_NAMES = List.of(
            "jjungyu12",
            "brightrain453",
            "junch-lee",
            "dutjddnr1224"
    );

    record VelogPost(String title, ZonedDateTime releasedAt, String displayName) {}

    public static void main(String[] args) {
        String webhookUrl = System.getenv("MATTERMOST_WEBHOOK_URL");
        if (webhookUrl == null || webhookUrl.isBlank()) {
            System.err.println("에러: MATTERMOST_WEBHOOK_URL 환경변수가 설정되지 않았습니다.");
            return;
        }

        try {
            HttpClient client = HttpClient.newHttpClient();
            ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());

            // 직전 주 월요일 02:00 ~ 이번 주 월요일 02:00 계산
            ZonedDateTime now = ZonedDateTime.now(KST);
            ZonedDateTime end = now.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
                    .withHour(2).withMinute(0).withSecond(0).withNano(0);
            ZonedDateTime start = end.minusWeeks(1);

            StringBuilder message = new StringBuilder();
            message.append("## 📝 Velog 주간 글 작성 체크 및 벌금 정산\n\n");
            message.append("- **체크 기간:** `").append(start.format(FORMATTER)).append("` ~ `").append(end.format(FORMATTER)).append("`\n");
            message.append("- **목표 개수:** 주 ").append(REQUIRED_COUNT).append("개 작성\n");
            message.append("- **벌금 규정:** 미달 1개당 3,000원 (※ 3개 모두 미작성 시 10,000원)\n\n");

            boolean hasMissingMember = false;
            int totalFine = 0;

            // 유저별 데이터 조회
            for (String username : USER_NAMES) {
                List<VelogPost> posts = fetchVelogPosts(client, mapper, username);

                // 이번 체크 기간에 해당하는 글만 필터링
                List<VelogPost> weeklyPosts = posts.stream()
                        .filter(p -> !p.releasedAt().isBefore(start) && p.releasedAt().isBefore(end))
                        .toList();

                // display_name 추출 (글이 없으면 username으로 대체)
                String displayName = username;
                if (!posts.isEmpty()) {
                    displayName = posts.get(0).displayName();
                }

                int count = weeklyPosts.size();
                boolean isCompleted = count >= REQUIRED_COUNT;

                // 벌금 계산
                int fine = 0;
                if (!isCompleted) {
                    hasMissingMember = true;
                    int missingCount = REQUIRED_COUNT - count;

                    if (missingCount == REQUIRED_COUNT) {
                        fine = 10000;
                    } else {
                        fine = missingCount * 3000;
                    }
                }
                totalFine += fine;

                // 결과 메시지 조립
                message.append(isCompleted ? "✅ " : "⚠️ ")
                        .append("**").append(displayName).append("** (`").append(username).append("`) : ")
                        .append(count).append("/").append(REQUIRED_COUNT).append("개");

                if (fine > 0) {
                    message.append(" (💸 **벌금: ").append(String.format("%,d원", fine)).append("**)");
                }
                message.append("\n");

                for (VelogPost post : weeklyPosts) {
                    message.append("  - ").append(post.title()).append(" (").append(post.releasedAt().format(FORMATTER)).append(")\n");
                }
                if (weeklyPosts.isEmpty()) {
                    message.append("  - _기간 내 작성된 글 없음_\n");
                }
                message.append("\n");
            }

            message.append("----------------------------------------\n");
            if (hasMissingMember) {
                message.append("👉 **하이디라오 가기 위해 다음 주에도 파이팅해 주세요!** (총 정산 금액: **").append(String.format("%,d원", totalFine)).append("**)");
            } else {
                message.append("🎉 **전원 기준 달성! 모두 고생하셨습니다. 벌금 없는 아쉬운 주간입니다!**");
            }

            // Mattermost 전송
            sendMattermost(client, mapper, webhookUrl, message.toString());
            System.out.println("성공: Mattermost 알림 전송 완료");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static List<VelogPost> fetchVelogPosts(HttpClient client, ObjectMapper mapper, String username) throws Exception {
        List<VelogPost> posts = new ArrayList<>();

        // 수정 포인트: 'input' 구조를 제거하고 인자를 직접 매핑합니다.
        String query = """
                query Posts($username: String, $limit: Int) {
                    posts(username: $username, limit: $limit) {
                        title
                        released_at
                        user {
                            profile {
                                display_name
                            }
                        }
                    }
                }
                """;



        Map<String, Object> payload = Map.of(
                "query", query,
                "variables", Map.of("username", username, "limit", 10)
        );

        String body = mapper.writeValueAsString(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(VELOG_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = mapper.readTree(response.body());

        // 디버깅용 팁: 벨로그 서버에서 에러 응답을 보냈는지 검사합니다.
        if (root.has("errors")) {
            System.err.println("벨로그 API 에러 [" + username + "]: " + root.path("errors").toString());
            return posts;
        }

        JsonNode postsNode = root.path("data").path("posts");

        if (postsNode.isArray()) {
            for (JsonNode node : postsNode) {
                String title = node.path("title").asText();
                String releasedAtText = node.path("released_at").asText();
                ZonedDateTime releasedAt = ZonedDateTime.parse(releasedAtText).withZoneSameInstant(KST);

                String displayName = node.path("user").path("profile").path("display_name").asText();
                if (displayName == null || displayName.isBlank()) {
                    displayName = username;
                }

                posts.add(new VelogPost(title, releasedAt, displayName));
            }
        }
        return posts;
    }

    private static void sendMattermost(HttpClient client, ObjectMapper mapper, String webhookUrl, String text) throws Exception {
        String payload = mapper.writeValueAsString(Map.of("text", text));
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(webhookUrl))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload))
                .build();
        client.send(request, HttpResponse.BodyHandlers.ofString());
    }
}