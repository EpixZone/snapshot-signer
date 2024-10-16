import {
  Box,
  Button,
  Icon,
  Link,
  Text,
  useColorModeValue,
  useTheme,
} from "@interchain-ui/react";

const stacks = ["x42", "Epix"];

export function Header() {
  return (
    <>
      <Box textAlign="center">
        <Text
          as="h1"
          fontWeight="$extrabold"
          fontSize={{ mobile: "$6xl", tablet: "$10xl" }}
          attributes={{
            marginBottom: "$8",
          }}
        >
          Epix Snapshot Claimer!
        </Text>
        <Text as="h2" fontWeight="$bold">
          <Text
            as="span"
            fontSize={{ mobile: "$3xl", tablet: "$8xl", desktop: "$8xl" }}
          >
          </Text>
          <Text
            as="span"
            fontSize={{ mobile: "$3xl", tablet: "$8xl", desktop: "$8xl" }}
            color={useColorModeValue("$primary500", "$primary200")}
          >
            {stacks.join(" -> ")}
          </Text>
        </Text>
      </Box>
    </>
  );
}
