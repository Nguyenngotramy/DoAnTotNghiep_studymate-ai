package com.studymate.service;

import com.studymate.model.Friendship;
import com.studymate.model.User;
import com.studymate.repository.FriendshipRepository;
import com.studymate.repository.UserRepository;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class FriendServiceTest {

    private final FriendshipRepository friendRepo = mock(FriendshipRepository.class);
    private final UserRepository userRepo = mock(UserRepository.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final FriendService friendService = new FriendService(friendRepo, userRepo, notificationService);

    @Test
    void returnsIncomingDirectionForReceiver() {
        Friendship friendship = pending("requester", "receiver");
        when(friendRepo.findBetween("receiver", "requester")).thenReturn(Optional.of(friendship));

        Map<String, Object> status = friendService.getStatus("receiver", "requester");

        assertEquals("PENDING", status.get("status"));
        assertEquals("INCOMING", status.get("direction"));
    }

    @Test
    void returnsOutgoingDirectionForRequester() {
        Friendship friendship = pending("requester", "receiver");
        when(friendRepo.findBetween("requester", "receiver")).thenReturn(Optional.of(friendship));

        Map<String, Object> status = friendService.getStatus("requester", "receiver");

        assertEquals("PENDING", status.get("status"));
        assertEquals("OUTGOING", status.get("direction"));
    }

    @Test
    void receiverCanAcceptPendingRequest() {
        Friendship friendship = pending("requester", "receiver");
        when(friendRepo.findBetween("requester", "receiver")).thenReturn(Optional.of(friendship));
        when(userRepo.findById("receiver")).thenReturn(Optional.of(user("receiver", "Receiver")));
        when(friendRepo.save(any(Friendship.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Friendship accepted = friendService.accept("receiver", "requester");

        assertEquals(Friendship.Status.ACCEPTED, accepted.getStatus());
        verify(friendRepo).save(friendship);
        verify(notificationService).send(
                eq("requester"),
                anyString(),
                anyString(),
                eq("FRIEND_ACCEPTED"),
                eq("/friends")
        );
    }

    @Test
    void requesterCannotAcceptOwnOutgoingRequest() {
        Friendship friendship = pending("requester", "receiver");
        when(friendRepo.findBetween("receiver", "requester")).thenReturn(Optional.of(friendship));

        RuntimeException error = assertThrows(
                RuntimeException.class,
                () -> friendService.accept("requester", "receiver")
        );

        assertEquals("Bạn không có quyền chấp nhận lời mời này", error.getMessage());
        verify(friendRepo, never()).save(any());
    }

    @Test
    void rejectFailsWhenRequestDoesNotExist() {
        when(friendRepo.findBetween("requester", "receiver")).thenReturn(Optional.empty());

        RuntimeException error = assertThrows(
                RuntimeException.class,
                () -> friendService.reject("receiver", "requester")
        );

        assertEquals("Không tìm thấy lời mời kết bạn", error.getMessage());
        verify(friendRepo, never()).delete(any());
    }

    @Test
    void removeFailsWhenRelationshipDoesNotExist() {
        when(friendRepo.findBetween("user", "friend")).thenReturn(Optional.empty());

        RuntimeException error = assertThrows(
                RuntimeException.class,
                () -> friendService.remove("user", "friend")
        );

        assertEquals("Không tìm thấy quan hệ kết bạn hoặc lời mời", error.getMessage());
    }

    private Friendship pending(String requesterId, String receiverId) {
        return Friendship.builder()
                .id("friendship-1")
                .requesterId(requesterId)
                .receiverId(receiverId)
                .status(Friendship.Status.PENDING)
                .build();
    }

    private User user(String id, String fullName) {
        return User.builder()
                .id(id)
                .fullName(fullName)
                .build();
    }
}
