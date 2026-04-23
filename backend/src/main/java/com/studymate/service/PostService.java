package com.studymate.service;

import com.studymate.dto.PageResponse;
import com.studymate.dto.request.PostRequest;
import com.studymate.model.Post;
import com.studymate.model.User;
import com.studymate.repository.PostRepository;
import com.studymate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepo;
    private final UserRepository userRepo;

    public PageResponse<Post> getFeed(String userId, int page) {
        return getFeed(userId, page, null);
    }

    public PageResponse<Post> getFeed(String userId, int page, String tagFilter) {
        int size = 10;
        User user = userRepo.findById(userId != null ? userId : "").orElse(null);

        Pageable pool = PageRequest.of(0, 500, Sort.by("createdAt").descending());
        List<Post> allRaw = postRepo.findByPublishedTrue(pool).getContent();

        Set<String> hiddenIds = new HashSet<>();
        if (user != null && user.getHiddenPostIds() != null) {
            hiddenIds.addAll(user.getHiddenPostIds());
        }

        List<Post> visiblePool = allRaw.stream()
                .filter(p -> !hiddenIds.contains(p.getId()))
                .collect(Collectors.toList());

        List<Post> all = (tagFilter != null && !tagFilter.isBlank())
                ? visiblePool.stream()
                .filter(p -> p.getTags() != null && p.getTags().stream()
                        .anyMatch(t -> t.equalsIgnoreCase(tagFilter.trim())))
                .collect(Collectors.toList())
                : visiblePool;

        if (user == null || user.getTagViewCount() == null || user.getTagViewCount().isEmpty()) {
            int from = page * size;
            List<Post> slice = all.stream().skip(from).limit(size).collect(Collectors.toList());
            int totalPages = (int) Math.ceil(all.size() / (double) size);
            return buildPage(slice, page, size, totalPages, all.size());
        }

        Map<String, Integer> tagScore = user.getTagViewCount();
        Set<String> viewedIds = new HashSet<>(
                user.getViewedPostIds() != null ? user.getViewedPostIds() : Collections.emptyList()
        );

        List<Post> unseen = all.stream().filter(p -> !viewedIds.contains(p.getId())).collect(Collectors.toList());
        List<Post> seen = all.stream().filter(p -> viewedIds.contains(p.getId())).collect(Collectors.toList());

        Comparator<Post> byScore = (a, b) -> {
            int diff = scorePost(b, tagScore) - scorePost(a, tagScore);
            return diff != 0 ? diff : b.getCreatedAt().compareTo(a.getCreatedAt());
        };

        List<Post> ranked = new ArrayList<>();
        ranked.addAll(unseen.stream().sorted(byScore).collect(Collectors.toList()));
        ranked.addAll(seen.stream().sorted(byScore).collect(Collectors.toList()));

        int from = page * size;
        if (from >= ranked.size()) return buildPage(Collections.emptyList(), page, size, page, 0);

        List<Post> slice = ranked.stream().skip(from).limit(size).collect(Collectors.toList());
        int totalPages = (int) Math.ceil(ranked.size() / (double) size);
        return buildPage(slice, page, size, totalPages, ranked.size());
    }

    private int scorePost(Post post, Map<String, Integer> tagScore) {
        int score = 0;

        if (post.getTags() != null) {
            for (String tag : post.getTags()) {
                String t = tag.toLowerCase().trim();
                score += tagScore.getOrDefault(t, 0);
            }
        }

        if (post.getCreatedAt() != null &&
                post.getCreatedAt().isAfter(Instant.now().minusSeconds(172800))) {
            score += 3;
        }

        int likeBoost = Math.min(post.getLikesCount() / 5, 10);
        int commentBoost = Math.min(post.getCommentsCount() / 3, 10);
        int saveBoost = Math.min(post.getSavedBy() != null ? post.getSavedBy().size() / 2 : 0, 10);

        score += likeBoost + commentBoost + saveBoost;
        return score;
    }

    public Post trackView(String postId, String userId) {
        Post post = postRepo.findById(postId).orElseThrow();
        post.setViews(post.getViews() + 1);
        postRepo.save(post);

        if (userId != null && !userId.isEmpty()) {
            userRepo.findById(userId).ifPresent(user -> {
                Map<String, Integer> tagCount = user.getTagViewCount();
                if (tagCount == null) tagCount = new HashMap<>();

                for (String tag : post.getTags()) {
                    tagCount.merge(tag.toLowerCase().trim(), 1, Integer::sum);
                }
                user.setTagViewCount(tagCount);

                List<String> viewed = user.getViewedPostIds();
                if (viewed == null) viewed = new ArrayList<>();
                if (!viewed.contains(postId)) {
                    viewed.add(0, postId);
                    if (viewed.size() > 200) viewed = viewed.subList(0, 200);
                }
                user.setViewedPostIds(viewed);
                userRepo.save(user);
            });
        }

        return post;
    }

    public PageResponse<Post> list(int page, String tag) {
        int size = 10;
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Post> result = (tag != null && !tag.isBlank())
                ? postRepo.findByPublishedTrueAndTagsContainingIgnoreCase(tag, pageable)
                : postRepo.findByPublishedTrue(pageable);
        return buildPage(result.getContent(), page, size, result.getTotalPages(), result.getTotalElements());
    }

    public List<Post> trending() {
        return postRepo.findByPublishedTrue(
                        PageRequest.of(0, 50, Sort.by("createdAt").descending())
                ).getContent().stream()
                .sorted((a, b) -> {
                    int sa = trendingScore(a);
                    int sb = trendingScore(b);
                    return Integer.compare(sb, sa);
                })
                .limit(10)
                .collect(Collectors.toList());
    }

    private int trendingScore(Post p) {
        int likes = p.getLikesCount() * 3;
        int comments = p.getCommentsCount() * 5;
        int saves = (p.getSavedBy() != null ? p.getSavedBy().size() : 0) * 4;
        int views = p.getViews();

        int recency = 0;
        if (p.getCreatedAt() != null) {
            if (p.getCreatedAt().isAfter(Instant.now().minusSeconds(86400))) recency += 20;
            else if (p.getCreatedAt().isAfter(Instant.now().minusSeconds(3 * 86400))) recency += 10;
        }

        return likes + comments + saves + views + recency;
    }

    public List<Map<String, Object>> getTrendingTags() {
        List<Post> recent = postRepo.findByPublishedTrue(
                PageRequest.of(0, 100, Sort.by("createdAt").descending())
        ).getContent();

        Map<String, Integer> tagCount = new HashMap<>();
        for (Post p : recent) {
            if (p.getTags() != null) {
                for (String t : p.getTags()) {
                    tagCount.merge(t.toLowerCase().trim(), 1, Integer::sum);
                }
            }
        }

        return tagCount.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .limit(20)
                .map(e -> Map.<String, Object>of("tag", e.getKey(), "count", e.getValue()))
                .collect(Collectors.toList());
    }

    public Post get(String id) {
        return postRepo.findById(id).orElseThrow();
    }

    public Post create(String authorId, String authorName, PostRequest req) {
        User author = userRepo.findById(authorId).orElse(null);

        Post post = Post.builder()
                .authorId(authorId)
                .authorName(authorName)
                .authorAvatar(author != null ? author.getAvatar() : null)
                .title(req.getTitle())
                .content(req.getContent())
                .tags(req.getTags() != null ? req.getTags() : new ArrayList<>())
                .imageUrls(req.getImageUrls() != null ? req.getImageUrls() : new ArrayList<>())
                .videoUrl(req.getVideoUrl())
                .coverImage(req.getCoverImage())
                .summary(req.getSummary())
                .published(true)
                .build();

        return postRepo.save(post);
    }

    public Post update(String id, String userId, PostRequest req) {
        Post post = postRepo.findById(id).orElseThrow();

        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền sửa bài viết này");
        }

        userRepo.findById(userId).ifPresent(user -> post.setAuthorAvatar(user.getAvatar()));

        post.setTitle(req.getTitle());
        post.setContent(req.getContent());
        post.setTags(req.getTags() != null ? req.getTags() : new ArrayList<>());
        post.setImageUrls(req.getImageUrls() != null ? req.getImageUrls() : new ArrayList<>());
        post.setVideoUrl(req.getVideoUrl());
        post.setCoverImage(req.getCoverImage());
        post.setSummary(req.getSummary());

        return postRepo.save(post);
    }

    public Post like(String id, String userId) {
        Post post = postRepo.findById(id).orElseThrow();
        if (post.getLikedBy().contains(userId)) {
            post.getLikedBy().remove(userId);
        } else {
            post.getLikedBy().add(userId);
            updateUserTagScore(userId, post.getTags(), 3);
        }
        return postRepo.save(post);
    }

    public Post save(String id, String userId) {
        Post post = postRepo.findById(id).orElseThrow();
        if (post.getSavedBy().contains(userId)) {
            post.getSavedBy().remove(userId);
        } else {
            post.getSavedBy().add(userId);
            updateUserTagScore(userId, post.getTags(), 5);
        }
        return postRepo.save(post);
    }

    public PageResponse<Post> getSavedPosts(String userId, int page) {
        int size = 10;
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Post> result = postRepo.findSavedPostsByUserId(userId, pageable);
        return buildPage(result.getContent(), page, size, result.getTotalPages(), result.getTotalElements());
    }

    public List<String> getHiddenPosts(String userId) {
        User user = userRepo.findById(userId).orElseThrow();
        return user.getHiddenPostIds() != null ? user.getHiddenPostIds() : new ArrayList<>();
    }

    public void hidePost(String postId, String userId) {
        User user = userRepo.findById(userId).orElseThrow();
        List<String> hidden = user.getHiddenPostIds();
        if (hidden == null) hidden = new ArrayList<>();

        if (!hidden.contains(postId)) {
            hidden.add(postId);
        }
        user.setHiddenPostIds(hidden);
        userRepo.save(user);
    }

    public void unhidePost(String postId, String userId) {
        User user = userRepo.findById(userId).orElseThrow();
        List<String> hidden = user.getHiddenPostIds();
        if (hidden == null) hidden = new ArrayList<>();

        hidden.remove(postId);
        user.setHiddenPostIds(hidden);
        userRepo.save(user);
    }

    private void updateUserTagScore(String userId, List<String> tags, int weight) {
        if (userId == null || tags == null || tags.isEmpty()) return;
        userRepo.findById(userId).ifPresent(user -> {
            Map<String, Integer> tagCount = user.getTagViewCount();
            if (tagCount == null) tagCount = new HashMap<>();
            for (String tag : tags) {
                String t = tag.toLowerCase().trim();
                tagCount.merge(t, weight, Integer::sum);
            }
            user.setTagViewCount(tagCount);
            userRepo.save(user);
        });
    }

    public Post addComment(String postId, String authorId, String authorName, String content) {
        Post post = postRepo.findById(postId).orElseThrow();
        User author = userRepo.findById(authorId).orElse(null);

        Post.Comment comment = Post.Comment.builder()
                .id(UUID.randomUUID().toString())
                .authorId(authorId)
                .authorName(authorName)
                .authorAvatar(author != null ? author.getAvatar() : null)
                .content(content)
                .createdAt(Instant.now())
                .build();

        post.getComments().add(comment);
        updateUserTagScore(authorId, post.getTags(), 2);
        return postRepo.save(post);
    }

    public void delete(String id, String userId) {
        Post post = postRepo.findById(id).orElseThrow();
        if (!post.getAuthorId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền xoá bài viết này");
        }
        postRepo.delete(post);
    }

    private PageResponse<Post> buildPage(List<Post> content, int page, int size, int totalPages, long totalElements) {
        return PageResponse.<Post>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalPages(totalPages)
                .totalElements(totalElements)
                .build();
    }
}