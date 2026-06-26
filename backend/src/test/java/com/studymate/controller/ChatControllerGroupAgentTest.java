package com.studymate.controller;

import com.studymate.dto.request.TaskRequest;
import com.studymate.model.ChatMessage;
import com.studymate.model.Group;
import com.studymate.model.Task;
import com.studymate.repository.ChatMessageRepository;
import com.studymate.repository.GroupRepository;
import com.studymate.repository.NotificationRepository;
import com.studymate.repository.UserRepository;
import com.studymate.service.DocumentService;
import com.studymate.service.FlashcardService;
import com.studymate.service.NotificationService;
import com.studymate.service.ProjectService;
import com.studymate.service.QuizService;
import com.studymate.service.TaskService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class ChatControllerGroupAgentTest {

    private final ChatMessageRepository chatRepo = mock(ChatMessageRepository.class);
    private final UserRepository userRepo = mock(UserRepository.class);
    private final GroupRepository groupRepo = mock(GroupRepository.class);
    private final NotificationRepository notificationRepo = mock(NotificationRepository.class);
    private final SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
    private final WebClient.Builder webClientBuilder = mock(WebClient.Builder.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final DocumentService documentService = mock(DocumentService.class);
    private final FlashcardService flashcardService = mock(FlashcardService.class);
    private final QuizService quizService = mock(QuizService.class);
    private final TaskService taskService = mock(TaskService.class);
    private final ProjectService projectService = mock(ProjectService.class);
    private final ChatController controller = new ChatController(
            chatRepo,
            userRepo,
            groupRepo,
            notificationRepo,
            messaging,
            webClientBuilder,
            notificationService,
            documentService,
            flashcardService,
            quizService,
            taskService,
            projectService
    );

    @Test
    void leaderApprovalCreatesTasksAndRecordsCreatedIds() {
        Group group = groupWithRole("leader-1", Group.Role.LEADER);
        ChatMessage message = proposalMessage(ChatMessage.ProposalStatus.PENDING);
        Authentication auth = authentication("leader-1");
        AtomicInteger taskNumber = new AtomicInteger();

        when(groupRepo.findById("group-1")).thenReturn(Optional.of(group));
        when(chatRepo.findById("message-1")).thenReturn(Optional.of(message));
        when(chatRepo.save(any(ChatMessage.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(taskService.create(eq("group-1"), eq("leader-1"), any(TaskRequest.class)))
                .thenAnswer(invocation -> Task.builder()
                        .id("task-" + taskNumber.incrementAndGet())
                        .build());

        controller.approveGroupAgentTasks("group-1", "message-1", auth, null);

        assertEquals(ChatMessage.ProposalStatus.APPROVED, message.getTaskProposal().getStatus());
        assertEquals("leader-1", message.getTaskProposal().getApprovedBy());
        assertEquals(List.of("task-1", "task-2"), message.getTaskProposal().getCreatedTaskIds());
        verify(taskService, times(2)).create(eq("group-1"), eq("leader-1"), any(TaskRequest.class));
        verify(chatRepo).save(message);
        verify(messaging).convertAndSend("/topic/group.group-1", message);
    }

    @Test
    void regularMemberCannotApproveGroupAgentTasks() {
        Group group = groupWithRole("member-1", Group.Role.MEMBER);
        when(groupRepo.findById("group-1")).thenReturn(Optional.of(group));

        RuntimeException error = assertThrows(
                RuntimeException.class,
                () -> controller.approveGroupAgentTasks(
                        "group-1",
                        "message-1",
                        authentication("member-1"),
                        null
                )
        );

        verify(chatRepo, never()).findById(anyString());
        verify(taskService, never()).create(anyString(), anyString(), any(TaskRequest.class));
        assertTrue(error.getMessage().contains("GroupAgent"));
    }

    @Test
    void approvedProposalCannotCreateDuplicateTasks() {
        Group group = groupWithRole("leader-1", Group.Role.LEADER);
        ChatMessage message = proposalMessage(ChatMessage.ProposalStatus.APPROVED);
        when(groupRepo.findById("group-1")).thenReturn(Optional.of(group));
        when(chatRepo.findById("message-1")).thenReturn(Optional.of(message));

        assertThrows(
                RuntimeException.class,
                () -> controller.approveGroupAgentTasks(
                        "group-1",
                        "message-1",
                        authentication("leader-1"),
                        null
                )
        );

        verify(taskService, never()).create(anyString(), anyString(), any(TaskRequest.class));
        verify(chatRepo, never()).save(any(ChatMessage.class));
    }

    private Authentication authentication(String userId) {
        Authentication auth = mock(Authentication.class);
        when(auth.getName()).thenReturn(userId);
        return auth;
    }

    private Group groupWithRole(String userId, Group.Role role) {
        return Group.builder()
                .id("group-1")
                .members(List.of(
                        Group.GroupMember.builder()
                                .userId(userId)
                                .fullName("Test User")
                                .role(role)
                                .build(),
                        Group.GroupMember.builder()
                                .userId("member-2")
                                .fullName("Second Member")
                                .role(Group.Role.MEMBER)
                                .build()
                ))
                .build();
    }

    private ChatMessage proposalMessage(ChatMessage.ProposalStatus status) {
        return ChatMessage.builder()
                .id("message-1")
                .groupId("group-1")
                .taskProposal(ChatMessage.TaskProposal.builder()
                        .summary("Phân công hai nhiệm vụ")
                        .status(status)
                        .tasks(List.of(
                                ChatMessage.ProposedTask.builder()
                                        .title("Tìm tài liệu")
                                        .priority("HIGH")
                                        .assigneeId("member-2")
                                        .build(),
                                ChatMessage.ProposedTask.builder()
                                        .title("Soạn bài trình bày")
                                        .priority("MEDIUM")
                                        .assigneeId("leader-1")
                                        .build()
                        ))
                        .build())
                .build();
    }
}
